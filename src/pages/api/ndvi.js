const ee = require('@google/earthengine');
// Or with better error handling:
if (!process.env.GOOGLE_SERVICE_KEY) {
  throw new Error('GOOGLE_SERVICE_KEY environment variable is not set');
}
const privateKey = process.env.GOOGLE_SERVICE_KEY;

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

// Helper function to get calendar day of year (1-365/366)
const getCalendarDay = (dateString) => {
  const date = new Date(dateString);
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

// Helper function to normalize calendar days to 1-365 range
const normalizeCalendarDay = (calendarDay, isLeapYear) => {
  if (isLeapYear && calendarDay > 59) { // After Feb 28 in leap year
    return calendarDay - 1; // Remove leap day
  }
  return calendarDay;
};

// Main handler function
export default async function handler(req, res) {
  try {
    console.log('NDVI Time Series API endpoint called');

    // Extract parameters
    const { startDate, endDate, region, province, municipality, includeTimeSeries = 'true' } = req.query;

    // Set default dates if not provided (last 2 years for better time series)
    const defaultEndDate = new Date().toISOString().split('T')[0];
    const defaultStartDate = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
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
    const roi = await getAdminGeometry(region, province, municipality);
    if (!roi) {
      return res.status(400).json({
        success: false,
        error: 'Could not create valid geometry for the specified region'
      });
    }

    console.log('Processing NDVI collection...');

    // Process the image collection with 16-day composite (MOD13Q1)
    const ndviCollection = ee.ImageCollection('MODIS/061/MOD13Q1')
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

    console.log(`Found ${collectionSize} NDVI images`);

    // --- Part 1: Generate the Median Composite Map ---
    console.log('Creating median composite map...');
    const ndviImage = ndviCollection.median().clip(roi);

    // NDVI color palette (red to green)
    const ndviVis = [
      'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718', '74A901',
      '66A000', '529400', '3E8601', '207401', '056201', '004C00', '023B01',
      '012E01', '011D01', '011301'
    ];

    const visParams = {
      min: 0,
      max: 8000,
      palette: ndviVis
    };

    const mapUrl = ndviImage.getMap(visParams);
    const geometryInfo = await getGeometryInfo(roi);

    // --- Part 2: Generate Time Series Data and Maps ---
    let timeSeriesData = [];
    let timeSeriesMaps = [];

    if (includeTimeSeries === 'true') {
      console.log('Generating time series data...');

      // Get time series statistics first
      const timeSeries = ndviCollection.map(image => {
        const date = ee.Date(image.get('system:time_start'));
        const dateString = date.format('YYYY-MM-dd');
        
        // Calculate statistics for the ROI
        const stats = image.reduceRegion({
          reducer: ee.Reducer.mean().combine({
            reducer2: ee.Reducer.median(),
            sharedInputs: true
          }).combine({
            reducer2: ee.Reducer.stdDev(),
            sharedInputs: true
          }),
          geometry: roi,
          scale: 250,
          maxPixels: 1e9
        });
        
        return ee.Feature(null, {
          date: dateString,
          timestamp: date.millis(),
          ndvi_mean: stats.get('NDVI_mean'),
          ndvi_median: stats.get('NDVI_median'),
          ndvi_stddev: stats.get('NDVI_stdDev')
        });
      });

      try {
        const timeSeriesResults = await evaluateEE(timeSeries.toList(collectionSize));
        
        // Process time series data with calendar day calculation
        timeSeriesData = timeSeriesResults.map(item => {
          const date = item.properties.date;
          const calendarDay = getCalendarDay(date);
          const year = new Date(date).getFullYear();
          const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
          const normalizedDay = normalizeCalendarDay(calendarDay, isLeapYear);
          
          return {
            date: date,
            timestamp: item.properties.timestamp,
            year: year,
            calendarDay: normalizedDay,
            ndvi_mean: item.properties.ndvi_mean ? item.properties.ndvi_mean / 10000 : null, // Normalize to 0-1
            ndvi_median: item.properties.ndvi_median ? item.properties.ndvi_median / 10000 : null,
            ndvi_stddev: item.properties.ndvi_stddev ? item.properties.ndvi_stddev / 10000 : null,
            ndvi_raw: item.properties.ndvi_median // Keep raw for map display
          };
        }).filter(item => item.ndvi_mean !== null);

        console.log(`Processed ${timeSeriesData.length} time series data points`);

        // Generate individual maps for time series using date-based filtering
        console.log('Generating time series maps using date filtering...');
        
        // Use the time series data we already have to generate maps
        const maxMaps = Math.min(15, timeSeriesData.length); // Reduced limit for performance
        const sampleIndices = [];
        
        // Sample evenly across the time series
        if (timeSeriesData.length > 0) {
          const step = Math.max(1, Math.floor(timeSeriesData.length / maxMaps));
          for (let i = 0; i < timeSeriesData.length; i += step) {
            sampleIndices.push(i);
            if (sampleIndices.length >= maxMaps) break;
          }
        }
        
        console.log(`Generating ${sampleIndices.length} sample maps from ${timeSeriesData.length} time points`);
        
        for (let i = 0; i < sampleIndices.length; i++) {
          try {
            const dataPoint = timeSeriesData[sampleIndices[i]];
            const dateString = dataPoint.date;
            
            // Create date range for filtering (16-day window to match MODIS composite)
            const startDate = new Date(dateString);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 16);
            
            // Filter collection to get image for this specific date
            const dateFilteredImage = ndviCollection
              .filterDate(startDate.toISOString().split('T')[0], 
                         endDate.toISOString().split('T')[0])
              .sort('system:time_start')
              .first()
              .select('NDVI')
              .clip(roi);
            
            const mapUrl = dateFilteredImage.getMap(visParams);
            
            timeSeriesMaps.push({
              date: dateString,
              url: mapUrl.urlFormat || mapUrl,
              timestamp: dataPoint.timestamp
            });
            
            console.log(`Generated map ${i + 1}/${sampleIndices.length} for ${dateString}`);
            
          } catch (error) {
            console.warn(`Failed to generate map for date ${timeSeriesData[sampleIndices[i]]?.date}:`, error.message);
          }
        }

      } catch (error) {
        console.warn('Time series generation failed:', error.message);
        console.log('Continuing with median composite only...');
        
        // If time series fails, we still have the median composite
        timeSeriesData = [];
        timeSeriesMaps = [];
      }
    }

    // --- Part 3: Calculate Multi-Year Calendar Day Averages ---
    const calendarDayAverages = [];
    if (timeSeriesData.length > 0) {
      console.log('Calculating calendar day averages...');
      
      for (let day = 1; day <= 365; day++) {
        const dayData = timeSeriesData.filter(item => item.calendarDay === day);
        
        if (dayData.length > 0) {
          const avgNDVI = dayData.reduce((sum, item) => sum + item.ndvi_mean, 0) / dayData.length;
          const medianNDVI = dayData.reduce((sum, item) => sum + item.ndvi_median, 0) / dayData.length;
          
          calendarDayAverages.push({
            calendarDay: day,
            ndvi_mean: avgNDVI,
            ndvi_median: medianNDVI,
            sampleCount: dayData.length,
            years: [...new Set(dayData.map(item => item.year))]
          });
        }
      }
    }

    console.log('Sending response...');

    // --- Final Response ---
    res.status(200).json({
      success: true,
      mapUrl: mapUrl,
      center: geometryInfo.center,
      bounds: geometryInfo.bounds,
      zoom: geometryInfo.zoom,
      timeSeries: {
        enabled: includeTimeSeries === 'true',
        data: timeSeriesData,
        maps: timeSeriesMaps,
        calendarDayAverages: calendarDayAverages,
        dateRange: {
          start: finalStartDate,
          end: finalEndDate
        },
        totalImages: collectionSize,
        processedMaps: timeSeriesMaps.length
      },
      metadata: {
        startDate: finalStartDate,
        endDate: finalEndDate,
        region: region || 'Philippines',
        province: province,
        municipality: municipality,
        dataset: 'MODIS NDVI (MOD13Q1)',
        collectionSize: collectionSize,
        totalDays: Math.ceil((new Date(finalEndDate) - new Date(finalStartDate)) / (1000 * 60 * 60 * 24)),
        ndviScale: {
          min: 0,
          max: 8000,
          realMin: -0.2,
          realMax: 1.0,
          description: 'Normalized Difference Vegetation Index'
        },
        interpretation: {
          'Water/Snow/Ice': '< 0',
          'Bare soil/Rock': '0 - 0.1',
          'Sparse vegetation': '0.1 - 0.3',
          'Moderate vegetation': '0.3 - 0.5',
          'Dense vegetation': '0.5 - 0.8',
          'Very dense vegetation': '> 0.8'
        },
        temporal: {
          frequency: '16-day composite',
          calendarDayRange: '1-365',
          normalizedForLeapYears: true
        },
        satellite: 'MODIS Terra',
        sensor: 'MOD13Q1',
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
        municipality: req.query.municipality,
        includeTimeSeries: req.query.includeTimeSeries
      }
    });
  }
};