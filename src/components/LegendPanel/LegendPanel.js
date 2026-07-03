const LegendPanel = ({ selectedLayer, isVisible, onToggle }) => {

  const getLegendItems = () => {
    if (selectedLayer === 'ndvi') {
      return [
        { name: 'Water / non-vegetated', color: '#a50026' },
        { name: 'Bare soil / built-up', color: '#f46d43' },
        { name: 'Sparse vegetation', color: '#fee08b' },
        { name: 'Moderate vegetation', color: '#a6d96a' },
        { name: 'Dense vegetation', color: '#1a9850' },
        { name: 'Very dense vegetation', color: '#006837' }
      ];
    } else if (selectedLayer === 'lulc') {
      return [
        { name: 'Water', color: '#1A5BAB' },
        { name: 'Trees', color: '#358221' },
        { name: 'Flooded Vegetation', color: '#87D19E' },
        { name: 'Crops', color: '#FFDB5C' },
        { name: 'Built Area', color: '#ED022A' },
        { name: 'Bare Ground', color: '#EDE9E4' },
        { name: 'Snow/Ice', color: '#F2FAFF' },
        { name: 'Clouds', color: '#C8C8C8' },
        { name: 'Rangeland', color: '#C6AD8D' }
      ];
    } else if (selectedLayer === 'rainfall') {
      return [
        { name: 'Dry (0 mm)', color: '#ffffff' },
        { name: 'Light', color: '#7ec3ff' },
        { name: 'Moderate', color: '#3a8bff' },
        { name: 'Heavy', color: '#0b52d4' },
        { name: 'Very heavy', color: '#7b2ff7' },
        { name: 'Extreme', color: '#d40b8c' }
      ];
    } else if (selectedLayer === 'flood') {
      return [
        { name: 'Flooded area', color: '#0000FF' }
      ];
    }
    return [];
  };

  const getTitle = () => {
    if (selectedLayer === 'ndvi') {
      return 'NDVI Legend';
    } else if (selectedLayer === 'lulc') {
      return 'Land Cover Classes';
    } else if (selectedLayer === 'rainfall') {
      return 'Rainfall (accumulated)';
    } else if (selectedLayer === 'flood') {
      return 'Flood Extent';
    }
    return 'Legend';
  };

  const getDescription = () => {
    if (selectedLayer === 'ndvi') {
      return 'Vegetation index values range from -1 to 1. Higher values indicate healthier, denser vegetation.';
    } else if (selectedLayer === 'lulc') {
      return 'Land use and land cover classification based on satellite imagery analysis.';
    } else if (selectedLayer === 'rainfall') {
      return 'Total precipitation (mm) accumulated over the selected period, from JAXA GSMaP.';
    } else if (selectedLayer === 'flood') {
      return 'Possible flood extent from Sentinel-1 SAR change detection (UN-SPIDER Recommended Practice). Change detection can yield false positives with no real flooding — treat as indicative.';
    }
    return '';
  };

  if (!selectedLayer) {
    return null;
  }

  return (
    <>
      {/* Legend Toggle Button */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          zIndex: 1001,
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid #dee2e6',
          borderRadius: '6px',
          padding: '10px 12px',
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
        title={isVisible ? 'Hide Legend' : 'Show Legend'}
        onMouseEnter={(e) => {
          e.target.style.background = 'rgba(255, 255, 255, 1)';
          e.target.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'rgba(255, 255, 255, 0.95)';
          e.target.style.transform = 'scale(1)';
        }}
      >
        <span>🎨</span>
        {isVisible ? 'Hide Legend' : 'Legend'}
      </button>

      {/* Legend Panel */}
      {isVisible && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          right: '20px',
          width: '320px',
          maxHeight: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid #dee2e6',
          borderRadius: '12px',
          padding: '16px',
          zIndex: 1000,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          fontSize: '13px'
        }}>
          {/* Header */}
          <div style={{ marginBottom: '12px' }}>
            <h4 style={{
              margin: '0 0 6px 0',
              fontSize: '15px',
              fontWeight: '600',
              color: '#343a40',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ fontSize: '16px' }}>
                {selectedLayer === 'ndvi' ? '🌱' : selectedLayer === 'rainfall' ? '🌧️' : '🗺️'}
              </span>
              {getTitle()}
            </h4>
            <p style={{
              margin: 0,
              fontSize: '11px',
              color: '#6c757d',
              lineHeight: '1.3'
            }}>
              {getDescription()}
            </p>
          </div>

          {/* Legend Items - Compact Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: selectedLayer === 'lulc' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
            gap: '6px',
            marginBottom: '12px'
          }}>
            {getLegendItems().map((item, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 6px',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                borderRadius: '4px',
                fontSize: '11px',
                border: '1px solid rgba(0,0,0,0.05)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
              }}
              >
                <div style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: item.color,
                  marginRight: '6px',
                  borderRadius: '2px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  flexShrink: 0,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}></div>
                <div style={{ 
                  fontWeight: '500',
                  color: '#343a40',
                  fontSize: '10px',
                  lineHeight: '1.2',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {item.name}
                </div>
              </div>
            ))}
          </div>

          {/* Additional Info */}
          <div style={{
            paddingTop: '10px',
            borderTop: '1px solid #e9ecef',
            fontSize: '10px',
            color: '#6c757d',
            textAlign: 'center',
            lineHeight: '1.3'
          }}>
            {selectedLayer === 'ndvi' ? (
              <div>Source: MODIS Satellite Data</div>
            ) : selectedLayer === 'rainfall' ? (
              <div>Source: JAXA GSMaP (~11 km, hourly)</div>
            ) : selectedLayer === 'flood' ? (
              <div>
                Source: Sentinel-1 SAR ·{' '}
                <a
                  href="https://www.un-spider.org/advisory-support/recommended-practices/recommended-practice-google-earth-engine-flood-mapping"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0066cc', textDecoration: 'underline' }}
                >
                  UN-SPIDER method
                </a>
              </div>
            ) : (
              <div>Source: ESRI Land Cover (10m)</div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default LegendPanel;