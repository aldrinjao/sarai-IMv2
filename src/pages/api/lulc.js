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

// Utility function to evaluate Earth Engine objects asynchronously
const evaluateEE = (eeObject) => {
  return new Promise((resolve, reject) => {
    eeObject.evaluate((result, error) => {
      if (error) {
        reject(new Error(`Earth Engine evaluation failed: ${error}`));
      } else {
        resolve(result);
      }
    });
  });
};

export default async function handler(req, res) {
  try {
    console.log('LULC API endpoint called');

    // Extract date parameters from query string
    const { startDate, endDate } = req.query;

    // Set default dates if not provided (using 2023 for more reliable data availability)
    const defaultStartDate = '2023-01-01';
    const defaultEndDate = '2023-12-31';

    const finalStartDate = startDate || defaultStartDate;
    const finalEndDate = endDate || defaultEndDate;

    console.log('Date range:', finalStartDate, 'to', finalEndDate);

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
    var lulcCollection = lulc
      .filterDate(finalStartDate, finalEndDate)
      .filterBounds(roi);

    // Check collection size asynchronously
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
          region: 'Philippines',
          collectionSize: collectionSize
        }
      });
    }

    // Process the collection
    lulcCollection = lulcCollection.mosaic()
      .remap([1, 2, 4, 5, 7, 8, 9, 10, 11], [1, 2, 3, 4, 5, 6, 7, 8, 9])
      .clip(roi);

    // Visualization parameters
    const visParams = {
      min: 1,
      max: 9,
      palette: colors
    };

    console.log('Getting map URL...');

    // Extract the tile URL template from the map object
    const mapUrl = lulcCollection.getMap(visParams);

    // Send response with additional metadata
    res.status(200).json({
      success: true,
      mapUrl: mapUrl,
      metadata: {
        startDate: finalStartDate,
        endDate: finalEndDate,
        region: 'Philippines',
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
        endDate: req.query.endDate
      }
    });
  }
}