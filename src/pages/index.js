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
  const [startDate, setStartDate] = useState('2017-01-01');
  const [endDate, setEndDate] = useState('2017-12-31');
  const [isUpdating, setIsUpdating] = useState(false);

  const [selectedLayer, setSelectedLayer] = useState(null); // New state for layer selection


  const fetchMapData = async (start = startDate, end = endDate, layerType = selectedLayer) => {

    if (!layerType) {
      console.log('No layer selected, skipping fetch');
      setLoading(false);
      return;
    }

    try {
      console.log(`Fetching map data for ${start} to ${end}...`);
      setIsUpdating(true);
      setError(null);


      // Use the appropriate endpoint based on layer type
      const endpoint = layerType === 'ndvi' ? '/api/ndvi' : '/api/lulc';
      const response = await axios.get(`${endpoint}?startDate=${start}&endDate=${end}`);

      console.log('Response:', response.data);

      if (response.data.success && response.data.mapUrl) {
        const url = response.data.mapUrl.urlFormat || response.data.mapUrl;
        setMapUrl(url);
        console.log('Map URL set:', url);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching map data:', err);
      setError(err.message || 'Failed to load map data');
    } finally {
      setLoading(false);
      setIsUpdating(false);
    }
  };


  const handleLayerChange = (layerType) => {
    console.log('Layer changed to:', layerType);
    setSelectedLayer(layerType);
    setMapUrl(''); // Clear existing map data
    setError(null);

    // Fetch new data for the selected layer
    if (layerType) {
      setLoading(true);
      fetchMapData(startDate, endDate, layerType);
    }
  };


  // Handle date changes from the control panel
  const handleDateChange = ({ startDate: newStartDate, endDate: newEndDate }) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  // Handle map updates from the control panel
  const handleUpdateMap = (start, end) => {
    fetchMapData(start, end, selectedLayer);
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
      <div style={{ display: 'flex', height: 'calc(100vh - 160px)' }}>
        {/* Control Panel */}
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



        {/* Map Container */}
        <div style={{ flex: 1, position: 'relative' }}>
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