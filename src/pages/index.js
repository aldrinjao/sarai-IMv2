import { useEffect, useState } from 'react';

import ControlPanel from '@components/ControlPanel';
import Layout from '@components/Layout';
import LegendPanel from '@components/LegendPanel';
import Map from '@components/Map';
import NDVIGraphPanel from '@components/NDVIGraphPanel';
import TimeDimensionController from '@components/TimeDimensionController';
import axios from 'axios';
import municipalitiesData from './locdata/table_municipality.json';
import provincesData from './locdata/table_province.json';
import regionsData from './locdata/table_region.json';
import styles from '@styles/Home.module.scss';

const DEFAULT_CENTER = [12, 120.036546];
const DEFAULT_ZOOM = 6;
const MAX_BOUNDS = [
  [21.063944194047764, 134.95605468750003],
  [2.9349970669152285, 105.38085937500001],
];

// Simple inline TimeDimensionController for testing
const SimpleTimeController = ({
  timeSeriesMaps = [],
  selectedLayer,
  selectedDate,
  onDateChange
}) => {

  if (selectedLayer !== 'ndvi') {
    return null;
  }

  const sortedMaps = timeSeriesMaps ?
    [...timeSeriesMaps].sort((a, b) => new Date(a.date) - new Date(b.date)) : [];

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1001,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      border: '1px solid #dee2e6',
      borderRadius: '12px',
      padding: '16px 20px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      minWidth: '300px'
    }}>
      <div style={{
        fontSize: '14px',
        fontWeight: '600',
        color: '#343a40',
        marginBottom: '8px',
        textAlign: 'center'
      }}>
        🕐 NDVI Time Series Controller
      </div>

      <div style={{
        fontSize: '12px',
        color: '#6c757d',
        textAlign: 'center',
        marginBottom: '12px'
      }}>
        {sortedMaps.length > 0 ? (
          <>
            <div>{sortedMaps.length} time steps available</div>
            <div>Selected: {selectedDate || 'None'}</div>
            <div>Range: {sortedMaps[0].date} to {sortedMaps[sortedMaps.length - 1].date}</div>
          </>
        ) : (
          <div>⏳ Loading time series data...</div>
        )}
      </div>

      {sortedMaps.length > 0 && (
        <div style={{ textAlign: 'center' }}>
          <button
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '12px',
              marginRight: '8px'
            }}
            onClick={() => {
              if (onDateChange && sortedMaps[0]) {
                onDateChange(sortedMaps[0].date);
              }
            }}
          >
            ⏮ First
          </button>

          <button
            style={{
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '12px',
              marginRight: '8px'
            }}
            onClick={() => {
              if (onDateChange && sortedMaps[Math.floor(sortedMaps.length / 2)]) {
                onDateChange(sortedMaps[Math.floor(sortedMaps.length / 2)].date);
              }
            }}
          >
            ⏯ Middle
          </button>

          <button
            style={{
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            onClick={() => {
              if (onDateChange && sortedMaps[sortedMaps.length - 1]) {
                onDateChange(sortedMaps[sortedMaps.length - 1].date);
              }
            }}
          >
            ⏭ Last
          </button>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const [mapUrl, setMapUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [bounds, setBounds] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);

  // Date range for analysis
  const [startDate, setStartDate] = useState(new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState(null);

  // Control panel visibility
  const [isPanelVisible, setIsPanelVisible] = useState(true);

  // Legend panel visibility
  const [isLegendVisible, setIsLegendVisible] = useState(false);

  // NDVI Graph panel visibility
  const [isGraphVisible, setIsGraphVisible] = useState(false);

  // Time dimension controller visibility
  const [isTimeControllerVisible, setIsTimeControllerVisible] = useState(false);

  // Time series data
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [timeSeriesMaps, setTimeSeriesMaps] = useState([]);
  const [calendarDayAverages, setCalendarDayAverages] = useState([]);
  const [timeSeriesMetadata, setTimeSeriesMetadata] = useState(null);

  // Current selected date for time series
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentTimeSeriesUrl, setCurrentTimeSeriesUrl] = useState('');

  // Location selection state
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState(null);
  const [regions] = useState(regionsData);
  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);

  // Animation state
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false);



  const [showModal, setShowModal] = useState(true);


  useEffect(() => {
    if (selectedRegion) {
      console.log(selectedRegion);
      const filteredProvinces = provincesData.filter(
        (prov) => prov.ADM1_PCODE === (selectedRegion)
      );
      setProvinces(filteredProvinces);
    } else {
      setProvinces([]);
    }
    setSelectedMunicipality(null);
  }, [selectedRegion]);

  useEffect(() => {
    if (selectedProvince) {
      const filteredMunicipalities = municipalitiesData.filter(
        (munc) => munc.ADM2_PCODE === (selectedProvince)
      );
      setMunicipalities(filteredMunicipalities);
    } else {
      setMunicipalities([]);
    }
    setSelectedMunicipality(null);
  }, [selectedProvince]);

  // Show panels when NDVI layer is selected
  useEffect(() => {
    if (selectedLayer === 'ndvi') {
      setIsLegendVisible(true);
      setIsGraphVisible(true);
      setIsTimeControllerVisible(true);
      setShowModal(false);

    } else if (selectedLayer === 'lulc') {
      setIsLegendVisible(true);
      setIsGraphVisible(false);
      setIsTimeControllerVisible(false);
      // Reset time series data for non-NDVI layers
      setTimeSeriesData([]);
      setTimeSeriesMaps([]);
      setCalendarDayAverages([]);
      setSelectedDate(null);
      setShowModal(false);
    } else {
      setIsLegendVisible(false);
      setIsGraphVisible(false);
      setIsTimeControllerVisible(false);
      setTimeSeriesData([]);
      setTimeSeriesMaps([]);
      setCalendarDayAverages([]);
      setSelectedDate(null);
    }

  }, [selectedLayer, timeSeriesMaps.length, calendarDayAverages.length]);

  // Function to update map view when bounds/center/zoom changes
  useEffect(() => {
    if (mapInstance && bounds) {
      try {
        // Use fitBounds if bounds are available for more precise fitting
        const leafletBounds = [
          [bounds.south, bounds.west],
          [bounds.north, bounds.east]
        ];
        mapInstance.fitBounds(leafletBounds, {
          padding: [20, 20], // Add some padding around the bounds
          maxZoom: 15 // Prevent zooming in too much for small areas
        });
      } catch (e) {
        console.warn('Error fitting bounds, using center/zoom fallback:', e);
        // Fallback to center/zoom if fitBounds fails
        mapInstance.setView([center[0], center[1]], zoom);
      }
    } else if (mapInstance && center && zoom) {
      console.log('Updating map view with center/zoom:', center, zoom);
      mapInstance.setView([center[0], center[1]], zoom);
    }
  }, [mapInstance, bounds, center, zoom]);

  // Update map URL when time series date changes
  useEffect(() => {
    if (selectedDate && timeSeriesMaps.length > 0) {
      const selectedMap = timeSeriesMaps.find(map => map.date === selectedDate);
      if (selectedMap) {
        setCurrentTimeSeriesUrl(selectedMap.url);
      }
    } else {
      setCurrentTimeSeriesUrl('');
    }
  }, [selectedDate, timeSeriesMaps]);

  const fetchMapData = async (start = startDate, end = endDate, layerType = selectedLayer) => {
    if (!layerType) {
      console.log('No layer selected, skipping fetch');
      setLoading(false);
      return;
    }

    try {
      setIsUpdating(true);
      setError(null);

      // Use the appropriate endpoint based on layer type
      const endpoint = layerType === 'ndvi' ? '/api/ndvi' : '/api/lulc';

      // Build query parameters
      let queryParams = `startDate=${start}&endDate=${end}`;
      if (selectedRegion) {
        queryParams += `&region=${selectedRegion}`;
      }
      if (selectedProvince) {
        queryParams += `&province=${selectedProvince}`;
      }
      if (selectedMunicipality) {
        queryParams += `&municipality=${selectedMunicipality}`;
      }

      // Enable time series for NDVI
      if (layerType === 'ndvi') {
        queryParams += '&includeTimeSeries=true';
      }

      console.log(`Fetching data from ${endpoint} with params:`, queryParams);
      const response = await axios.get(`${endpoint}?${queryParams}`);

      if (response.data.success) {
        // Handle both old and new response formats
        const url = response.data.tileUrlTemplate || response.data.mapUrl?.urlFormat || response.data.mapUrl;

        console.log('Received map data:', {
          url: url,
          center: response.data.center,
          zoom: response.data.zoom,
          bounds: response.data.bounds
        });

        setMapUrl(url);

        // Update map view based on API response
        if (response.data.center && response.data.center.latitude && response.data.center.longitude) {
          const newCenter = [response.data.center.latitude, response.data.center.longitude];
          setCenter(newCenter);
          console.log('Setting new center:', newCenter);
        }

        if (response.data.zoom && response.data.zoom > 0) {
          setZoom(response.data.zoom);
          console.log('Setting new zoom:', response.data.zoom);
        }

        if (response.data.bounds) {
          setBounds(response.data.bounds);
          console.log('Setting new bounds:', response.data.bounds);
        }

        // Handle time series data for NDVI
        if (layerType === 'ndvi' && response.data.timeSeries) {
          setTimeSeriesData(response.data.timeSeries.data || []);
          setTimeSeriesMaps(response.data.timeSeries.maps || []);
          setCalendarDayAverages(response.data.timeSeries.calendarDayAverages || []);
          setTimeSeriesMetadata(response.data.timeSeries);

          console.log('Time series data:', {
            dataPoints: response.data.timeSeries.data?.length,
            maps: response.data.timeSeries.maps?.length,
            calendarAverages: response.data.timeSeries.calendarDayAverages?.length
          });

          // Set initial selected date to the most recent available
          if (response.data.timeSeries.maps && response.data.timeSeries.maps.length > 0) {
            const sortedMaps = [...response.data.timeSeries.maps].sort((a, b) => new Date(b.date) - new Date(a.date));
            setSelectedDate(sortedMaps[0].date);
          }
        }

        setError(null);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        console.error('Error: No map data found for the specified parameters (404).');
        setError('No data found for this period and location. Please try a different date range or area.');
        setMapUrl(null);
      } else {
        console.error('An unexpected error occurred:', err.message);
        setError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setLoading(false);
      setIsUpdating(false);
    }
  };

  const handleLayerChange = (layerType) => {
    setSelectedLayer(layerType);
    setMapUrl('');
    setCurrentTimeSeriesUrl('');
    setError(null);

    setIsLegendVisible(false);
    setIsGraphVisible(false);
    setIsTimeControllerVisible(false);
    // Reset to default view when no layer is selected
    setCenter(DEFAULT_CENTER);
    setZoom(DEFAULT_ZOOM);
    setBounds(null);
    setTimeSeriesData([]);
    setTimeSeriesMaps([]);
    setCalendarDayAverages([]);
    setSelectedDate(null);
  };

  const handleRegionChange = (regionId) => {
    setSelectedRegion(regionId || null);
    setSelectedProvince(null);
    setSelectedMunicipality(null);
  };

  const handleProvinceChange = (provinceId) => {
    setSelectedProvince(provinceId || null);
    setSelectedMunicipality(null);
  };

  const handleMunicipalityChange = (municipalityId) => {
    setSelectedMunicipality(municipalityId || null);
  };

  const handleDateChange = ({ startDate: newStartDate, endDate: newEndDate }) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const handleUpdateMap = (start, end) => {
    fetchMapData(start, end, selectedLayer);
  };

  const togglePanel = () => {
    setIsPanelVisible(!isPanelVisible);
  };

  const toggleLegend = () => {
    setIsLegendVisible(!isLegendVisible);
  };

  const toggleGraph = () => {
    setIsGraphVisible(!isGraphVisible);
  };

  const toggleTimeController = () => {
    setIsTimeControllerVisible(!isTimeControllerVisible);
  };

  const handleTimeSeriesDateChange = (date) => {
    setSelectedDate(date);
  };

  const handleAnimationPlayStateChange = (isPlaying) => {
    setIsAnimationPlaying(isPlaying);
  };

  const renderMapLayers = ({ TileLayer, Marker, Popup, map }) => {
    // Store map instance for programmatic control
    if (map && !mapInstance) {
      setMapInstance(map);
    }

    // Determine which URL to use for the tile layer
    const activeTileUrl = currentTimeSeriesUrl || mapUrl;

    return (
      <>
        {/* Base Map Layer */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
        />

        {/* Data Layer */}
        {activeTileUrl && (
          <TileLayer
            key={selectedDate || 'static'} // Force re-render when date changes
            url={activeTileUrl}
            attribution="Google Earth Engine"
            opacity={0.8}
          />
        )}

        {/* Loading Indicator */}
        {(loading || isUpdating) && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '50%', // Set the left edge to the horizontal center of the parent
            transform: 'translateX(-50%)', // Shift the element back by half its own width
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '12px 16px',
            borderRadius: '6px',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '14px',
            fontWeight: '500',
            color: '#495057',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid #f3f3f3',
              borderTop: '2px solid #007bff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>

            {loading ?
              (selectedLayer === 'ndvi' ? 'Loading NDVI time series...' : 'Loading Earth Engine data...') :
              'Updating map...'}
            <style jsx>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}


        {!selectedLayer && !loading && showModal && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '24px 32px',
            borderRadius: '12px',
            zIndex: 1000,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            textAlign: 'center',
            maxWidth: '300px'
          }}>
            {/* Close Button */}
            <button
              onClick={() => { setShowModal(false); }}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6c757d',
                lineHeight: '1',
                padding: '0'
              }}
            >
              &times;
            </button>
            {/* End of Close Button */}
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>🛰️</div>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#343a40'
            }}>
              Select a Data Layer
            </h3>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#6c757d',
              lineHeight: '1.4'
            }}>
              Choose an overlay to start exploring satellite data.
            </p>
          </div>
        )}

        {/* Debug Info Panel (remove in production) */}
        {selectedLayer === 'ndvi' && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '12px',
            zIndex: 999,
            maxWidth: '200px'
          }}>
            <div><strong>Debug Info:</strong></div>
            <div>Layer: {selectedLayer}</div>
            <div>Time series maps: {timeSeriesMaps.length}</div>
            <div>Calendar averages: {calendarDayAverages.length}</div>
            <div>Time controller visible: {isTimeControllerVisible ? 'Yes' : 'No'}</div>
            <div>Selected date: {selectedDate || 'None'}</div>
            <div>Loading: {loading ? 'Yes' : 'No'}</div>
            <div>Updating: {isUpdating ? 'Yes' : 'No'}</div>
          </div>
        )}

        {/* Simple Time Series Controller (for testing) */}
        {/* <SimpleTimeController
          timeSeriesMaps={timeSeriesMaps}
          selectedLayer={selectedLayer}
          selectedDate={selectedDate}
          onDateChange={handleTimeSeriesDateChange}
        /> */}

        {/* Original Time Series Controller - Hidden for now */}
        {false && selectedLayer === 'ndvi' && (
          <TimeDimensionController
            timeSeriesMaps={timeSeriesMaps}
            isVisible={isTimeControllerVisible && timeSeriesMaps.length > 0}
            onToggle={toggleTimeController}
            onDateChange={handleTimeSeriesDateChange}
            selectedDate={selectedDate}
            isPlaying={isAnimationPlaying}
            onPlayStateChange={handleAnimationPlayStateChange}
          />
        )}

        {/* Show Time Controller Toggle Button when NDVI is selected but controller is hidden */}
        {selectedLayer === 'ndvi' && timeSeriesMaps.length > 0 && !isTimeControllerVisible && (
          <button
            onClick={toggleTimeController}
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1001,
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              padding: '10px 16px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              fontSize: '14px',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500',
              color: '#495057'
            }}
            title="Show Time Controls"
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 1)';
              e.target.style.transform = 'translateX(-50%) scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.95)';
              e.target.style.transform = 'translateX(-50%) scale(1)';
            }}
          >
            <span>⏯️</span>
            Time Controls ({timeSeriesMaps.length} maps)
          </button>
        )}

        {/* Legend Panel */}
        <LegendPanel
          selectedLayer={selectedLayer}
          isVisible={isLegendVisible}
          onToggle={toggleLegend}
        />

        {/* NDVI Graph Panel */}
        {selectedLayer === 'ndvi' && (
          <NDVIGraphPanel
            calendarDayAverages={calendarDayAverages}
            isVisible={isGraphVisible}
            onToggle={toggleGraph}
            selectedDate={selectedDate}
            metadata={timeSeriesMetadata}
          />
        )}
      </>
    );
  };

  return (
    <Layout>
      <div style={{ display: 'flex', height: 'calc(100vh - 80px)', position: 'relative' }}>
        {/* Toggle Button */}
        <button
          onClick={togglePanel}
          style={{
            position: 'absolute',
            top: '80px',
            left: isPanelVisible ? '330px' : '30px',
            zIndex: 1001,
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #a6a8a9ff',
            borderRadius: '6px',
            padding: '10px 12px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            fontSize: '16px',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '44px',
            minHeight: '44px'
          }}
          title={isPanelVisible ? 'Hide Control Panel' : 'Show Control Panel'}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 1)';
            e.target.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.95)';
            e.target.style.transform = 'scale(1)';
          }}
        >
          {isPanelVisible ? '◀' : '▶'}
        </button>

        {/* Control Panel */}
        <div style={{
          transform: `translateX(${isPanelVisible ? '0' : '-100%'})`,
          transition: 'transform 0.3s ease',
          width: '320px',
          flexShrink: 0,
          zIndex: 1000
        }}>
          <ControlPanel
            startDate={startDate}
            endDate={endDate}
            selectedLayer={selectedLayer}
            selectedRegion={selectedRegion}
            selectedProvince={selectedProvince}
            selectedMunicipality={selectedMunicipality}
            regions={regions}
            provinces={provinces}
            municipalities={municipalities}
            onLayerChange={handleLayerChange}
            onRegionChange={handleRegionChange}
            onProvinceChange={handleProvinceChange}
            onMunicipalityChange={handleMunicipalityChange}
            onDateChange={handleDateChange}
            onUpdateMap={handleUpdateMap}
            isUpdating={isUpdating}
            error={error}
          />
        </div>

        {/* Map Container */}
        <div style={{
          flex: 1,
          position: 'relative',
          marginLeft: isPanelVisible ? '0' : '-300px',
          transition: 'margin-left 0.3s ease'
        }}>
          <Map
            className={styles.homeMap}
            center={center}
            zoom={zoom}
            minZoom={5}
            maxBounds={MAX_BOUNDS}
            style={{ height: '100%', width: '100%' }}
          >
            {renderMapLayers}
          </Map>
        </div>
      </div>
    </Layout>
  );
}