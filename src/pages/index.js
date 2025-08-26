import { useEffect, useState } from 'react';

import ControlPanel from '@components/ControlPanel';
import Layout from '@components/Layout';
import LegendPanel from '@components/LegendPanel';
import Map from '@components/Map';
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

export default function Home() {
  const [mapUrl, setMapUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [bounds, setBounds] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);

  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState(null);

  // Control panel visibility
  const [isPanelVisible, setIsPanelVisible] = useState(true);

  // Legend panel visibility
  const [isLegendVisible, setIsLegendVisible] = useState(false);

  // Location selection state
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState(null);
  const [regions] = useState(regionsData);
  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);

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

  // Show legend when layer is selected
  useEffect(() => {
    if (selectedLayer) {
      setIsLegendVisible(true);
    }
  }, [selectedLayer]);

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

        if (response.data.data) {
          console.log('Received time series data:', response.data.data);
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
    setError(null);

    if (layerType) {
      setLoading(true);
      fetchMapData(startDate, endDate, layerType);
    } else {
      setIsLegendVisible(false);
      // Reset to default view when no layer is selected
      setCenter(DEFAULT_CENTER);
      setZoom(DEFAULT_ZOOM);
      setBounds(null);
    }
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

    // If a layer is selected, refetch data with new municipality

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

  const renderMapLayers = ({ TileLayer, Marker, Popup, map }) => {
    // Store map instance for programmatic control
    if (map && !mapInstance) {
      setMapInstance(map);
    }

    return (
      <>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
        />
        {mapUrl && (
          <TileLayer
            url={mapUrl}
            attribution="Google Earth Engine"
          />
        )}
        {(loading || isUpdating) && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
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
            {loading ? 'Loading Earth Engine data...' : 'Updating map...'}
            <style jsx>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {!selectedLayer && !loading && (
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
              Choose NDVI or LULC from the control panel to begin exploring satellite data.
            </p>
          </div>
        )}

        {/* Legend Panel */}
        <LegendPanel
          selectedLayer={selectedLayer}
          isVisible={isLegendVisible}
          onToggle={toggleLegend}
        />
      </>
    );
  };

  return (
    <Layout>
      <div style={{ display: 'flex', height: 'calc(100vh - 160px)', position: 'relative' }}>
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
            minZoom={5} // Reduced minimum zoom to allow for larger areas
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