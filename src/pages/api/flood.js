const ee = require('@google/earthengine');
if (!process.env.GOOGLE_SERVICE_KEY) {
  throw new Error('GOOGLE_SERVICE_KEY environment variable is not set');
}
const privateKey = JSON.parse(process.env.GOOGLE_SERVICE_KEY);


const {
  isValidDate,
  getDateBoundaries,
  evaluateEE,
  getGeometryInfo,
  getAdminGeometry,
  initializeEE
} = require('./function');

let isInitialized = false;

// Wrapper for Earth Engine initialization to handle state
const initEE = async () => {
  if (isInitialized) {
    return;
  }
  await initializeEE(privateKey);
  isInitialized = true;
};

// Main handler function for flood detection
export default async function handler(req, res) {
  try {
    console.log('Flood Detection API endpoint called');

    // Extract parameters from query string
    const { 
      beforeStart, 
      beforeEnd, 
      afterStart, 
      afterEnd,
      region, 
      province, 
      municipality,
      polarization = 'VH', // VH is preferred for flood mapping, but VV is also available
      passDirection = 'DESCENDING',
      differenceThreshold = 1.25,
      smoothingRadius = 50,
      slopeThreshold = 5,
      connectedPixelThreshold = 8
    } = req.query;

    console.log('Query parameters:', { 
      beforeStart, beforeEnd, afterStart, afterEnd, 
      region, province, municipality,
      polarization, passDirection 
    });

    // Set default dates if not provided
    // Default to Typhoon Ulysses event as in the original script
    const defaultBeforeStart = beforeStart || '2020-10-01';
    const defaultBeforeEnd = beforeEnd || '2020-11-01';
    const defaultAfterStart = afterStart || '2020-11-02';
    const defaultAfterEnd = afterEnd || '2020-11-25';

    // Validate date formats
    if (!isValidDate(defaultBeforeStart) || !isValidDate(defaultBeforeEnd)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid before period date format. Use YYYY-MM-DD format.'
      });
    }

    if (!isValidDate(defaultAfterStart) || !isValidDate(defaultAfterEnd)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid after period date format. Use YYYY-MM-DD format.'
      });
    }

    // Validate date ranges
    try {
      getDateBoundaries(defaultBeforeStart, defaultBeforeEnd);
      getDateBoundaries(defaultAfterStart, defaultAfterEnd);
    } catch (dateError) {
      return res.status(400).json({
        success: false,
        error: dateError.message
      });
    }

    // Initialize Earth Engine
    await initEE();

    console.log('Getting admin geometry...');
    
    // Get the region of interest geometry
    const roi = await getAdminGeometry(region, province, municipality);
    
    if (!roi) {
      return res.status(400).json({
        success: false,
        error: 'Could not create valid geometry for the specified region'
      });
    }

    console.log('Loading Sentinel-1 GRD collection...');

    // Load and filter Sentinel-1 GRD data
    const collection = ee.ImageCollection('COPERNICUS/S1_GRD')
      .filter(ee.Filter.eq('instrumentMode', 'IW'))
      .filter(ee.Filter.listContains('transmitterReceiverPolarisation', polarization))
      .filter(ee.Filter.eq('orbitProperties_pass', passDirection))
      .filter(ee.Filter.eq('resolution_meters', 10))
      .filterBounds(roi)
      .select(polarization);

    // Select images by predefined dates
    const beforeCollection = collection.filterDate(defaultBeforeStart, defaultBeforeEnd);
    const afterCollection = collection.filterDate(defaultAfterStart, defaultAfterEnd);

    // Check collection sizes
    const beforeSize = await evaluateEE(beforeCollection.size());
    const afterSize = await evaluateEE(afterCollection.size());

    console.log(`Before collection size: ${beforeSize}, After collection size: ${afterSize}`);

    if (beforeSize === 0 || afterSize === 0) {
      return res.status(404).json({
        success: false,
        error: 'Insufficient Sentinel-1 data for the specified dates and region',
        metadata: {
          beforePeriod: `${defaultBeforeStart} to ${defaultBeforeEnd}`,
          afterPeriod: `${defaultAfterStart} to ${defaultAfterEnd}`,
          beforeImages: beforeSize,
          afterImages: afterSize,
          suggestion: 'Try adjusting date ranges or using a different pass direction (ASCENDING/DESCENDING)'
        }
      });
    }

    console.log('Creating mosaics and applying speckle filtering...');

    // Create mosaics and clip to study area
    const before = beforeCollection.mosaic().clip(roi);
    const after = afterCollection.mosaic().clip(roi);

    // Apply speckle filtering
    const beforeFiltered = before.focal_mean(smoothingRadius, 'circle', 'meters');
    const afterFiltered = after.focal_mean(smoothingRadius, 'circle', 'meters');

    console.log('Calculating flood extent...');

    // Calculate the difference between before and after images
    const difference = afterFiltered.divide(beforeFiltered);

    // Apply threshold to create binary flood mask
    const differenceBinary = difference.gt(parseFloat(differenceThreshold));

    // Refine flood extent using additional datasets
    console.log('Refining flood extent with water masks and terrain...');

    // Include JRC layer on surface water seasonality
    // Mask areas of permanent water (water > 10 months/year)
    const swater = ee.Image('JRC/GSW1_0/GlobalSurfaceWater').select('seasonality');
    const swaterMask = swater.gte(10).updateMask(swater.gte(10));

    // Remove permanent water bodies from flood extent
    let flooded = differenceBinary.where(swaterMask, 0);
    flooded = flooded.updateMask(flooded);

    // Apply connectivity filter to reduce noise
    const connections = flooded.connectedPixelCount();
    flooded = flooded.updateMask(connections.gte(parseInt(connectedPixelThreshold)));

    // Mask out steep slopes using DEM
    const DEM = ee.Image('WWF/HydroSHEDS/03VFDEM');
    const terrain = ee.Algorithms.Terrain(DEM);
    const slope = terrain.select('slope');
    flooded = flooded.updateMask(slope.lt(parseInt(slopeThreshold)));

    console.log('Calculating flood statistics...');

    // Calculate flood extent area
    const floodPixelArea = flooded
      .select(polarization)
      .multiply(ee.Image.pixelArea());

    // Sum the areas of flooded pixels
    const floodStats = floodPixelArea.reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: roi,
      scale: 10,
      maxPixels: 1e9,
      bestEffort: true
    });

    // Convert to hectares
    const floodAreaHa = await evaluateEE(
      ee.Number(floodStats.get(polarization))
        .divide(10000)
        .round()
    );

    console.log(`Calculated flood area: ${floodAreaHa} hectares`);

    // Get visualization parameters
    const sarVis = {
      min: -25,
      max: 0,
      palette: ['000000', 'FFFFFF']
    };

    const floodVis = {
      min: 0,
      max: 1,
      palette: ['0000FF']
    };

    const differenceVis = {
      min: 0,
      max: 2,
      palette: ['0000FF', 'FFFFFF', 'FF0000']
    };

    console.log('Generating map URLs...');

    // Get map URLs for visualization
    const beforeUrl = beforeFiltered.getMap(sarVis);
    const afterUrl = afterFiltered.getMap(sarVis);
    const differenceUrl = difference.getMap(differenceVis);
    const floodedUrl = flooded.getMap(floodVis);

    // Get geometry info
    const geometryInfo = await getGeometryInfo(roi);

    // Get date ranges for the collections
    const getDateRange = async (imageCollection) => {
      try {
        const range = await evaluateEE(
          imageCollection.reduceColumns(ee.Reducer.minMax(), ["system:time_start"])
        );
        return {
          start: new Date(range.min).toISOString().split('T')[0],
          end: new Date(range.max).toISOString().split('T')[0]
        };
      } catch (error) {
        return null;
      }
    };

    const beforeDateRange = await getDateRange(beforeCollection);
    const afterDateRange = await getDateRange(afterCollection);

    // Send successful response
    res.status(200).json({
      success: true,
      maps: {
        before: beforeUrl,
        after: afterUrl,
        difference: differenceUrl,
        flooded: floodedUrl
      },
      center: geometryInfo.center,
      bounds: geometryInfo.bounds,
      zoom: geometryInfo.zoom,
      statistics: {
        floodedAreaHa: floodAreaHa || 0,
        floodedAreaKm2: (floodAreaHa / 100).toFixed(2)
      },
      metadata: {
        analysis: {
          beforePeriod: beforeDateRange || {
            start: defaultBeforeStart,
            end: defaultBeforeEnd
          },
          afterPeriod: afterDateRange || {
            start: defaultAfterStart,
            end: defaultAfterEnd
          },
          beforeImages: beforeSize,
          afterImages: afterSize
        },
        location: {
          region: region || 'Philippines',
          province: province || null,
          municipality: municipality || null
        },
        parameters: {
          polarization: polarization,
          passDirection: passDirection,
          differenceThreshold: parseFloat(differenceThreshold),
          smoothingRadius: parseInt(smoothingRadius),
          slopeThreshold: parseInt(slopeThreshold),
          connectedPixelThreshold: parseInt(connectedPixelThreshold)
        },
        satellite: 'Sentinel-1',
        sensor: 'C-band Synthetic Aperture Radar',
        resolution: '10m',
        methodology: 'Change detection using SAR backscatter intensity',
        interpretation: {
          'Blue areas': 'Potentially flooded areas',
          'Excluded': 'Permanent water bodies, steep slopes (>' + slopeThreshold + '°)',
          'Filtering': 'Speckle filter (' + smoothingRadius + 'm radius), connectivity filter (>' + connectedPixelThreshold + ' pixels)'
        },
        disclaimer: 'Disclaimer: This product has been derived automatically without validation data. All geographic information has limitations due to the scale, resolution, date and interpretation of the original source materials. No liability concerning the content or the use thereof is assumed by the producer.',
        script_author: "UN-SPIDER Decembe 2019"
      }
    });

    
  } catch (error) {
    console.error('API Error:', error);

    // Send error response
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
      requestParams: {
        beforeStart: req.query.beforeStart,
        beforeEnd: req.query.beforeEnd,
        afterStart: req.query.afterStart,
        afterEnd: req.query.afterEnd,
        region: req.query.region,
        province: req.query.province,
        municipality: req.query.municipality
      }
    });
  }
};