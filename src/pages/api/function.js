const ee = require('@google/earthengine');

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

// Extract the min/max lon/lat extent from an evaluated ee.Geometry.bounds() result
const boundsToExtent = (bounds) => {
  const coords = bounds.coordinates[0];
  const lons = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  return {
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats)
  };
};

// Approximate a web-map zoom level from the largest extent span (in degrees)
const zoomFromSpan = (maxSpan) => {
  if (maxSpan >= 10) return 5;    // Country/large region level
  if (maxSpan >= 5) return 6;     // Large province level
  if (maxSpan >= 2) return 7;     // Province level
  if (maxSpan >= 1) return 8;     // Large city level
  if (maxSpan >= 0.5) return 9;   // City level
  if (maxSpan >= 0.2) return 10;  // Municipality level
  if (maxSpan >= 0.1) return 11;  // Town level
  if (maxSpan >= 0.05) return 12; // District level
  return 13;                      // Neighborhood level
};

// Build the standard geometry-info payload from an extent + center
const buildInfo = ({ minLon, maxLon, minLat, maxLat }, center) => ({
  center,
  bounds: { north: maxLat, south: minLat, east: maxLon, west: minLon },
  zoom: zoomFromSpan(Math.max(maxLat - minLat, maxLon - minLon))
});

// Utility function to calculate appropriate zoom level based on geometry bounds
const calculateZoomLevel = async (geometry) => {
  try {
    const extent = boundsToExtent(await evaluateEE(geometry.bounds(1)));
    return zoomFromSpan(Math.max(extent.maxLat - extent.minLat, extent.maxLon - extent.minLon));
  } catch (error) {
    console.warn('Error calculating zoom level:', error);
    return 8; // Default zoom level
  }
};

// Utility function to get geometry center and bounds info
const getGeometryInfo = async (geometry) => {
  // Preferred: centroid-based center, retried with a larger error margin on failure
  for (const margin of [1, 10]) {
    try {
      const centroid = await evaluateEE(geometry.centroid(margin).coordinates());
      const extent = boundsToExtent(await evaluateEE(geometry.bounds(margin)));
      return buildInfo(extent, { longitude: centroid[0], latitude: centroid[1] });
    } catch (error) {
      console.warn(`getGeometryInfo failed at error margin ${margin}:`, error.message);
    }
  }

  // Fallback: derive the center from the bounding-box midpoint
  try {
    const extent = boundsToExtent(await evaluateEE(geometry.bounds(100)));
    return buildInfo(extent, {
      longitude: (extent.minLon + extent.maxLon) / 2,
      latitude: (extent.minLat + extent.maxLat) / 2
    });
  } catch (finalError) {
    console.warn('All geometry info attempts failed, using Philippines default:', finalError.message);
    // Default to Philippines center if all attempts fail
    return {
      center: { longitude: 121.7740, latitude: 12.8797 },
      bounds: { north: 21.0, south: 4.5, east: 127.0, west: 116.0 },
      zoom: 6
    };
  }
};

// Function to get the geometry of a specific administrative unit
const getAdminGeometry = async (region, province, municipality) => {
  try {
    console.log('getAdminGeometry called with:', { region, province, municipality });

    // If no parameters are provided, default to the entire Philippines
    if (!region && !province && !municipality) {
      console.log('No admin parameters provided, using Philippines boundary');
      const philippines = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
        .filter(ee.Filter.eq('country_na', 'Philippines'))
        .first()
        .geometry();
      return philippines;
    }

    let phBoundaries;
    let filters = [];

    // Determine which administrative level to use based on the most specific parameter provided
    if (municipality) {
      console.log('Using municipality level (admin3)');
      phBoundaries = ee.FeatureCollection('projects/decoded-academy-219803/assets/ph_admin3');
      filters.push(ee.Filter.eq('ADM3_PCODE', municipality));
      
      // Include parent filters if provided
      if (province) filters.push(ee.Filter.eq('ADM2_PCODE', province));
      if (region) filters.push(ee.Filter.eq('ADM1_PCODE', region));
      
    } else if (province) {
      console.log('Using province level (admin2)');
      phBoundaries = ee.FeatureCollection('projects/decoded-academy-219803/assets/ph_admin2');
      filters.push(ee.Filter.eq('ADM2_PCODE', province));
      
      // Include parent filter if provided
      if (region) filters.push(ee.Filter.eq('ADM1_PCODE', region));
      
    } else if (region) {
      console.log('Using region level (admin1)');
      phBoundaries = ee.FeatureCollection('projects/decoded-academy-219803/assets/ph_admin1');
      filters.push(ee.Filter.eq('ADM1_PCODE', region));
    }

    if (filters.length === 0) {
      console.log('No valid filters created, using Philippines boundary');
      const philippines = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
        .filter(ee.Filter.eq('country_na', 'Philippines'))
        .first()
        .geometry();
      return philippines;
    }

    // Combine all filters
    let combinedFilter = filters.length > 1 ?
      ee.Filter.and(...filters) :
      filters[0];

    console.log('Applying filters to collection...');
    const filteredCollection = phBoundaries.filter(combinedFilter);

    // Check if the collection has any features
    const collectionSize = await evaluateEE(filteredCollection.size());
    console.log(`Filtered collection size: ${collectionSize}`);

    if (collectionSize === 0) {
      console.log('No features found with current filters, falling back to Philippines boundary');
      const philippines = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
        .filter(ee.Filter.eq('country_na', 'Philippines'))
        .first()
        .geometry();
      return philippines;
    }

    // Get the geometry from the first (and likely only) feature
    const geometry = filteredCollection.first().geometry();
    console.log('Successfully retrieved geometry');
    
    return geometry;

  } catch (error) {
    console.error('Error in getAdminGeometry:', error);

    // Always fallback to Philippines boundary in case of any error
    console.log('Falling back to Philippines boundary due to error');
    const philippines = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
      .filter(ee.Filter.eq('country_na', 'Philippines'))
      .first()
      .geometry();

    return philippines;
  }
};

// Earth Engine initialization function
const initializeEE = (privateKey) => {
  return new Promise((resolve, reject) => {
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

// Lazily parse and cache the service-account key so all routes share one copy.
// Throws on first use (not module load) if the env var is missing, so the
// error surfaces as a handled 500 rather than a crash at import time.
let cachedPrivateKey;
const getServiceKey = () => {
  if (cachedPrivateKey) return cachedPrivateKey;
  if (!process.env.GOOGLE_SERVICE_KEY) {
    throw new Error('GOOGLE_SERVICE_KEY environment variable is not set');
  }
  cachedPrivateKey = JSON.parse(process.env.GOOGLE_SERVICE_KEY);
  return cachedPrivateKey;
};

// Idempotent Earth Engine initialization shared across every API route.
// The in-flight promise is cached so concurrent requests don't authenticate twice.
let initPromise = null;
const initEE = () => {
  if (!initPromise) {
    initPromise = initializeEE(getServiceKey()).catch((err) => {
      initPromise = null; // allow a retry on the next request if init failed
      throw err;
    });
  }
  return initPromise;
};

module.exports = {
  isValidDate,
  getDateBoundaries,
  evaluateEE,
  calculateZoomLevel,
  getGeometryInfo,
  getAdminGeometry,
  initializeEE,
  getServiceKey,
  initEE
};