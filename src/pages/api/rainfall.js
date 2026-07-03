import * as ee from '@google/earthengine';

import {
  evaluateEE,
  getAdminGeometry,
  getDateBoundaries,
  getGeometryInfo,
  initEE,
  isValidDate
} from './function';
import { withApiGuards } from '../../lib/apiGuards';

// GSMaP = JAXA Global Satellite Mapping of Precipitation, operational v6.
// Hourly, global, ~0.1° (~11 km), ~4-hour latency — i.e. near real time.
// We use the gauge-calibrated band (hourlyPrecipRateGC, mm/hr).
const GSMAP_DATASET = 'JAXA/GPM_L3/GSMaP/v6/operational';
const RAIN_BAND = 'hourlyPrecipRateGC';
const GSMAP_SCALE_M = 11132; // native ~0.1° resolution

// Accumulated-rainfall palette: white (dry) -> blue -> purple -> magenta (wettest)
const RAINFALL_PALETTE = [
  '#ffffff',
  '#c7e9ff',
  '#7ec3ff',
  '#3a8bff',
  '#0b52d4',
  '#7b2ff7',
  '#d40b8c'
];

const getMapPromise = (image, visParams) => {
  return new Promise((resolve, reject) => {
    image.getMap(visParams, (map, err) => {
      if (err) reject(err);
      else resolve(map);
    });
  });
};

const roundMm = (v) => (v == null ? null : Math.round(v * 10) / 10);

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { startDate, endDate, region, province, municipality } = req.query;
    // Visualization ceiling in mm (accumulated). Tunable per request.
    const maxRainfall = parseFloat(req.query.maxRainfall) || 500;

    // 1. Dates — default to the last 7 days (a near-real-time window)
    const defaultEndDate = new Date().toISOString().split('T')[0];
    const defaultStartDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const finalStartDate = startDate || defaultStartDate;
    const finalEndDate = endDate || defaultEndDate;

    if (!isValidDate(finalStartDate) || !isValidDate(finalEndDate)) {
      return res.status(400).json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    try {
      getDateBoundaries(finalStartDate, finalEndDate);
    } catch (dateError) {
      return res.status(400).json({ success: false, error: dateError.message });
    }

    // 2. Initialize Earth Engine
    await initEE();

    // 3. Region of interest
    const roi = await getAdminGeometry(region, province, municipality);
    if (!roi) {
      return res.status(400).json({
        success: false,
        error: 'Could not create valid geometry for the specified region'
      });
    }

    // 4. GSMaP hourly precip -> accumulate to total mm over the range.
    // Band is mm/hr and images are hourly, so a straight sum yields total mm.
    const collection = ee.ImageCollection(GSMAP_DATASET)
      .select(RAIN_BAND)
      .filterDate(finalStartDate, finalEndDate)
      .filterBounds(roi);

    const collectionSize = await evaluateEE(collection.size());
    if (collectionSize === 0) {
      return res.status(404).json({
        success: false,
        error: 'No GSMaP rainfall data found for the specified date range and region',
        metadata: { startDate: finalStartDate, endDate: finalEndDate }
      });
    }

    const rainfallImage = collection.sum().clip(roi);

    // 5. Map tiles + ROI statistics + geometry, in parallel
    const statsReducer = ee.Reducer.mean().combine({
      reducer2: ee.Reducer.max(),
      sharedInputs: true
    });

    const [mapDetails, stats, geometryInfo] = await Promise.all([
      getMapPromise(rainfallImage, { min: 0, max: maxRainfall, palette: RAINFALL_PALETTE }),
      evaluateEE(
        rainfallImage.reduceRegion({
          reducer: statsReducer,
          geometry: roi,
          scale: GSMAP_SCALE_M,
          maxPixels: 1e9,
          bestEffort: true
        })
      ),
      getGeometryInfo(roi)
    ]);

    // 6. Response (patterned with the LULC / flood routes)
    res.status(200).json({
      success: true,
      mapUrl: mapDetails.urlFormat,
      mapId: mapDetails.mapid,
      center: geometryInfo.center,
      bounds: geometryInfo.bounds,
      zoom: geometryInfo.zoom,
      statistics: {
        meanRainfallMm: roundMm(stats[`${RAIN_BAND}_mean`]),
        maxRainfallMm: roundMm(stats[`${RAIN_BAND}_max`])
      },
      metadata: {
        startDate: finalStartDate,
        endDate: finalEndDate,
        region: region || 'Philippines',
        province,
        municipality,
        dataset: 'JAXA GSMaP operational v6 (hourly, gauge-calibrated)',
        band: RAIN_BAND,
        units: 'mm (accumulated over the date range)',
        collectionSize,
        latency: '~4 hours (near real time)',
        resolution: '~11 km (0.1°)',
        visualization: {
          min: 0,
          max: maxRainfall,
          palette: 'white -> blue -> purple -> magenta'
        }
      }
    });
  } catch (error) {
    console.error('Rainfall API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}

export default withApiGuards(handler, { ttlMs: 30 * 60 * 1000 });
