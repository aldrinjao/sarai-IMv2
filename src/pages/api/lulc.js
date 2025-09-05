const ee = require('@google/earthengine');
// const privateKey = require('./ee_key.json');
if (!process.env.GOOGLE_SERVICE_KEY) {
  throw new Error('GOOGLE_SERVICE_KEY environment variable is not set');
}

const privateKey = JSON.parse(process.env.GOOGLE_SERVICE_KEY);

console.log(privateKey);

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

// Main handler function
export default async function handler(req, res) {
  try {
    console.log('LULC API endpoint called');

    // Extract parameters from query string
    const { startDate, endDate, region, province, municipality } = req.query;

    console.log('Query parameters:', { startDate, endDate, region, province, municipality });

    // Set default dates if not provided
    const defaultStartDate = '2023-01-01';
    const defaultEndDate = '2023-12-31';

    const finalStartDate = startDate || defaultStartDate;
    const finalEndDate = endDate || defaultEndDate;

    // Validate date formats
    if (!isValidDate(finalStartDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid start date format. Use YYYY-MM-DD format.'
      });
    }

    if (!isValidDate(finalEndDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid end date format. Use YYYY-MM-DD format.'
      });
    }

    // Validate date range
    try {
      getDateBoundaries(finalStartDate, finalEndDate);
    } catch (dateError) {
      return res.status(400).json({
        success: false,
        error: dateError.message
      });
    }

    // Initialize Earth Engine if not already done
    await initEE();

    console.log('Creating Earth Engine objects...');

    const colors = [
      "#1A5BAB", // Water
      "#358221", // Trees
      "#87D19E", // Flooded Vegetation
      "#FFDB5C", // Crops
      "#ED022A", // Built Area
      "#EDE9E4", // Bare Ground
      "#F2FAFF", // Snow/Ice
      "#C8C8C8", // Clouds
      "#C6AD8D"  // Rangeland
    ];

    // Get the region of interest geometry
    console.log('Getting admin geometry...');
    const roi = await getAdminGeometry(region, province, municipality);

    if (!roi) {
      return res.status(400).json({
        success: false,
        error: 'Could not create valid geometry for the specified region'
      });
    }

    console.log('Processing image collection...');

    // Get the LULC dataset
    const lulc = ee.ImageCollection('projects/sat-io/open-datasets/landcover/ESRI_Global-LULC_10m_TS');

    // Process the image collection with dynamic date filtering
    let lulcCollection = lulc
      .filterDate(finalStartDate, finalEndDate)
      .filterBounds(roi);

    // Check collection size
    console.log('Checking collection size...');
    const collectionSize = await evaluateEE(lulcCollection.size());
    console.log(`LULC Collection Size: ${collectionSize}`);

    // Check if collection is empty
    if (collectionSize === 0) {
      return res.status(404).json({
        success: false,
        error: 'No LULC data found for the specified date range and region',
        metadata: {
          startDate: finalStartDate,
          endDate: finalEndDate,
          region: region || 'Philippines',
          province: province,
          municipality: municipality,
          collectionSize: collectionSize
        }
      });
    }

    // Create the final processed image
    const lulcImage = lulcCollection
      .mosaic()
      .remap([1, 2, 4, 5, 7, 8, 9, 10, 11], [1, 2, 3, 4, 5, 6, 7, 8, 9])
      .clip(roi);

    // Visualization parameters
    const visParams = {
      min: 1,
      max: 9,
      palette: colors
    };

    console.log('Getting map URL...');

    // Get the map tiles URL
    const mapUrl = lulcImage.getMap(visParams);

    console.log('Calculating geometry info...');

    // Get center, bounds, and zoom level for the region
    const geometryInfo = await getGeometryInfo(roi);

    // Send successful response
    res.status(200).json({
      success: true,
      mapUrl: mapUrl,
      center: geometryInfo.center,
      bounds: geometryInfo.bounds,
      zoom: geometryInfo.zoom,
      metadata: {
        startDate: finalStartDate,
        endDate: finalEndDate,
        region: region || 'Philippines',
        province: province,
        municipality: municipality,
        dataset: 'ESRI Global Land Use Land Cover',
        collectionSize: collectionSize,
        totalDays: Math.ceil((new Date(finalEndDate) - new Date(finalStartDate)) / (1000 * 60 * 60 * 24)),
        colors: {
          water: colors[0],
          trees: colors[1],
          floodedVegetation: colors[2],
          crops: colors[3],
          builtArea: colors[4],
          bareGround: colors[5],
          snowIce: colors[6],
          clouds: colors[7],
          rangeland: colors[8]
        },
        classMapping: {
          1: 'Water',
          2: 'Trees',
          3: 'Flooded Vegetation',
          4: 'Crops',
          5: 'Built Area',
          6: 'Bare Ground',
          7: 'Snow/Ice',
          8: 'Clouds',
          9: 'Rangeland'
        }
      }
    });

  } catch (error) {
    console.error('API Error:', error);

    // Send detailed error response
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
      requestParams: {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        region: req.query.region,
        province: req.query.province,
        municipality: req.query.municipality
      }
    });
  }
};