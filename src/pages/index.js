import { useEffect, useState } from 'react';

import ControlPanel from '@components/ControlPanel';
import Layout from '@components/Layout';
import Map from '@components/Map';
import axios from 'axios';
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

  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState(null);

  // New state for control panel visibility
  const [isPanelVisible, setIsPanelVisible] = useState(true);

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
      
      // start = layerType === 'lulc' ? ('2021-01-01') : start;
      // setStartDate(start);
      const response = await axios.get(`${endpoint}?startDate=${start}&endDate=${end}`);

      if (response.data.success && response.data.mapUrl) {
        const url = response.data.mapUrl.urlFormat || response.data.mapUrl;
        setMapUrl(url);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        console.error('Error: No map data found for the specified parameters (404).');
        setError('No data found for this period. Please try a different date range.');
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
    console.log('Layer changed to:', layerType);
    setSelectedLayer(layerType);
    setMapUrl('');
    setError(null);

    if (layerType) {
      setLoading(true);
      fetchMapData(startDate, endDate, layerType);
    }
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

  const renderMapLayers = ({ TileLayer, Marker, Popup }) => (
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
    </>
  );

  return (
    <Layout>
      <div style={{ display: 'flex', height: 'calc(100vh - 160px)', position: 'relative' }}>
        {/* Toggle Button */}
        <button
          onClick={togglePanel}
          style={{
            position: 'absolute',
            top: '80px',
            left: isPanelVisible ? '305px' : '10px',
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
          width: '300px',
          flexShrink: 0,
          zIndex: 1000
        }}>
          <ControlPanel
            startDate={startDate}
            endDate={endDate}
            selectedLayer={selectedLayer}
            onLayerChange={handleLayerChange}
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
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            minZoom={DEFAULT_ZOOM}
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