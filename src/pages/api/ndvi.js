const ee = require('@google/earthengine');
const privateKey = require('./ee_key.json');
const {
  isValidDate,
  getDateBoundaries,
  evaluateEE,
  getGeometryInfo,
  getAdminGeometry,
  getROI,
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
module.exports = async function handler(req, res) {
  try {
    console.log('NDVI Map and Time Series API endpoint called');

    // Extract parameters
    const { startDate, endDate, region, province, municipality } = req.query;

    // Set default dates if not provided
    const defaultStartDate = '2023-01-01';
    const defaultEndDate = '2023-12-31';
    const finalStartDate = startDate || defaultStartDate;
    const finalEndDate = endDate || defaultEndDate;

    // Validate dates
    if (!isValidDate(finalStartDate) || !isValidDate(finalEndDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD format.'
      });
    }

    try {
      getDateBoundaries(finalStartDate, finalEndDate);
    } catch (dateError) {
      return res.status(400).json({
        success: false,
        error: dateError.message
      });
    }

    // Initialize Earth Engine
    await initEE();

    // Get ROI based on location parameters
    let roi;
    try {
      roi = await getAdminGeometry(region, province, municipality);
    } catch (error) {
      console.warn('getAdminGeometry failed, using fallback getROI:', error.message);
      roi = getROI(region, province, municipality);
    }

    if (!roi) {
      return res.status(400).json({
        success: false,
        error: 'Could not create valid geometry for the specified region'
      });
    }

    console.log('Processing NDVI collection...');

    // Process the image collection
    const ndviCollection = ee.ImageCollection('MODIS/061/MYD13Q1')
      .select('NDVI')
      .filterDate(finalStartDate, finalEndDate)
      .filterBounds(roi)
      .sort('system:time_start');

    // Check collection size
    const collectionSize = await evaluateEE(ndviCollection.size());
    if (collectionSize === 0) {
      return res.status(404).json({
        success: false,
        error: 'No NDVI data found for the specified date range and region'
      });
    }

    // --- Part 1: Generate the Median Composite Map ---
    console.log('Creating median composite map...');
    const ndviImage = ndviCollection.median().clip(roi);

    // NDVI color palette (red to green)
    const ndviVis = [
      'ffffff', 'ce7e45', 'df923d', 'f1b555', 'fcd163', '99b718', '74a901',
      '66a000', '529400', '3e8601', '207401', '056201', '004c00', '023b01',
      '012e01', '011d01', '011301'
    ];

    const visParams = {
      min: 0,
      max: 8000,
      palette: ndviVis
    };

    const mapUrl = ndviImage.getMap(visParams);
    const geometryInfo = await getGeometryInfo(roi);

    // --- Part 2: Generate the Time Series Data ---
    console.log('Fetching time series data...');
    const timeSeries = ndviCollection.map(image => {
      const date = ee.Date(image.get('system:time_start')).format('YYYY-MM-dd');
      const medianValue = image.reduceRegion({
        reducer: ee.Reducer.median(),
        geometry: roi,
        scale: 250,
        maxPixels: 1e9
      });
      return ee.Feature(null, {
        date: date,
        ndvi: medianValue.get('NDVI')
      });
    });

    const data = await evaluateEE(timeSeries.toList(timeSeries.size()));
    const formattedData = data.map(item => ({
      date: item.properties.date,
      ndvi: item.properties.ndvi,
    }));

    console.log('Sending combined response...');

    // --- Final Combined Response ---
    res.status(200).json({
      success: true,
      mapUrl: mapUrl,
      center: geometryInfo.center,
      bounds: geometryInfo.bounds,
      zoom: geometryInfo.zoom,
      data: formattedData,
      metadata: {
        startDate: finalStartDate,
        endDate: finalEndDate,
        region: region || 'Philippines',
        province: province,
        municipality: municipality,
        dataset: 'MODIS NDVI',
        collectionSize: collectionSize,
        totalDays: Math.ceil((new Date(finalEndDate) - new Date(finalStartDate)) / (1000 * 60 * 60 * 24)),
        ndviScale: {
          min: 0,
          max: 8000,
          realMin: -0.2,
          realMax: 1.0,
          description: 'Normalized Difference Vegetation Index (scaled 0-8000)'
        },
        interpretation: {
          'Water/Snow/Ice': '< 0',
          'Bare soil/Rock': '0 - 0.1',
          'Sparse vegetation': '0.1 - 0.3',
          'Moderate vegetation': '0.3 - 0.5',
          'Dense vegetation': '0.5 - 0.8',
          'Very dense vegetation': '> 0.8'
        },
        formula: '(NIR - Red) / (NIR + Red)',
        satellite: 'MODIS Aqua',
        sensor: 'MYD13Q1',
        resolution: '250m'
      }
    });

  } catch (error) {
    console.error('API Error:', error);
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