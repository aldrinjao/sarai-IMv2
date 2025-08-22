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
        console.log('NDVI API endpoint called');

        // Extract date parameters from query string
        const { startDate, endDate } = req.query;

        // Set default dates if not provided
        const defaultStartDate = '2017-01-01';
        const defaultEndDate = '2017-12-31';

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
        await initializeEE();

        console.log('Creating Earth Engine objects...');

        var roi = ee.FeatureCollection('WM/geoLab/geoBoundaries/600/ADM0')
            .filter(ee.Filter.eq('shapeName', 'Philippines'))
            .first()
            .geometry();

        // Define collections and band names based on the satellite



        console.log('Processing NDVI collection...');

        // Process the image collection
        const ndviCollection = ee.ImageCollection('MODIS/061/MYD13Q1').select('NDVI')
            .filterDate(finalStartDate, finalEndDate)
            .filterBounds(roi).clip(roi);
        // Calculate median NDVI for the time period



        // NDVI color palette (red to green)
        const ndviVis = [
            'ffffff', 'ce7e45', 'df923d', 'f1b555', 'fcd163', '99b718', '74a901',
            '66a000', '529400', '3e8601', '207401', '056201', '004c00', '023b01',
            '012e01', '011d01', '011301'
        ];

        // Visualization parameters for NDVI
        const visParams = {
            min: 0,
            max: 8000,
            palette: ndviVis
        };

        console.log('Getting NDVI map URL...');

        // Get the map URL
        const mapUrl = ndviCollection.getMap(visParams);

        console.log('Sending NDVI response...');

        // Calculate collection info
        // Use a promise to get the size asynchronously
        const collectionSize = await ndviCollection.size().getInfo();
        console.log(collectionSize);

        // Send response with additional metadata
        res.status(200).json({
            success: true,
            mapUrl: mapUrl,
            metadata: {
                startDate: startDate,
                endDate: finalEndDate,
                region: 'Philippines',
                totalDays: Math.ceil((new Date(finalEndDate) - new Date(finalStartDate)) / (1000 * 60 * 60 * 24)),
                ndviScale: {
                    min: -0.2,
                    max: 0.8,
                    description: 'Normalized Difference Vegetation Index (-1 to 1)'
                },
                legend: {
                    'Very Low (-0.2 to 0)': '#ce7e45',
                    'Low (0 to 0.2)': '#f46d43',
                    'Medium (0.2 to 0.4)': '#fee08b',
                    'High (0.4 to 0.6)': '#abdda4',
                    'Very High (0.6 to 0.8)': '#011301'
                },
                interpretation: {
                    'Water/Snow/Ice': '< 0',
                    'Bare soil/Rock': '0 - 0.1',
                    'Sparse vegetation': '0.1 - 0.3',
                    'Moderate vegetation': '0.3 - 0.5',
                    'Dense vegetation': '0.5 - 0.8',
                    'Very dense vegetation': '> 0.8'
                },
                numberOfImages: collectionSize // Use the retrieved size
            }
        });

    } catch (error) {
        console.error('Error in NDVI handler:', error);

        // Send detailed error response
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
            timestamp: new Date().toISOString(),
            requestParams: {
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                satellite: req.query.satellite
            }
        });
    }
}