const ee = require('@google/earthengine');
const privateKey = require('./ee_key.json');

let isInitialized = false;

const initializeEE = () => {
  return new Promise((resolve, reject) => {
    if (isInitialized) {
      resolve();
      return;
    }

    console.log('Authenticating with Earth Engine...');

    // Authenticate using the private key
    ee.data.authenticateViaPrivateKey(
      privateKey,
      () => {
        console.log('Authentication succeeded!');
        // Initialize Earth Engine after successful authentication
        ee.initialize(
          null,
          null,
          () => {
            console.log('Earth Engine client library initialized.');
            isInitialized = true;
            resolve();
          },
          (err) => {
            console.error('Failed to initialize Earth Engine:', err);
            reject(err);
          }
        );
      },
      (err) => {
        console.error('Authentication failed:', err);
        reject(err);
      }
    );
  });
};

// Utility function to validate date format
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
};

// Utility function to get date range boundaries
const getDateBoundaries = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Ensure end date is after start date
  if (end <= start) {
    throw new Error('End date must be after start date');
  }

  // Check if date range is reasonable (not more than 10 years)
  const diffYears = (end - start) / (1000 * 60 * 60 * 24 * 365);
  if (diffYears > 10) {
    throw new Error('Date range cannot exceed 10 years');
  }

  return { start, end };
};

export default async function handler(req, res) {
  try {
    console.log('API endpoint called');

    // Extract date parameters from query string
    const { startDate, endDate } = req.query;

    // Set default dates if not provided
    const defaultStartDate = '2017-01-01';
    const defaultEndDate = '2017-12-31';

    const finalStartDate = startDate || defaultStartDate;
    const finalEndDate = endDate || defaultEndDate;

    console.log(`Date range: ${finalStartDate} to ${finalEndDate}`);

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
    await initializeEE();

    console.log('Creating Earth Engine objects...');

    const lulc = ee.ImageCollection('projects/sat-io/open-datasets/landcover/ESRI_Global-LULC_10m_TS');

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


    var roi = ee.FeatureCollection('WM/geoLab/geoBoundaries/600/ADM0')
      .filter(ee.Filter.eq('shapeName', 'Philippines'))
      .first()
      .geometry();

    console.log('Processing image collection...');

    // Process the image collection with dynamic date filtering
    const image = lulc
      .filterDate(finalStartDate, finalEndDate)
      .filterBounds(roi)
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

    // Get the map URL
    const mapUrl = image.getMap(visParams);

    console.log('Sending response...');

    // Send response with additional metadata
    res.status(200).json({
      success: true,
      mapUrl: mapUrl,
      metadata: {
        startDate: finalStartDate,
        endDate: finalEndDate,
        region: 'Philippines',
        dataset: 'ESRI Global Land Use Land Cover',
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
        }
      }
    });

  } catch (error) {
    console.error('Error in handler:', error);

    // Send detailed error response
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
      requestParams: {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      }
    });
  }
}