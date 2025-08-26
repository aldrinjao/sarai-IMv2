const LegendPanel = ({ selectedLayer, isVisible, onToggle }) => {
  
  const getLegendItems = () => {
    if (selectedLayer === 'ndvi') {
      return [
        { name: 'Bare soil/Rock', color: '#df923d' },
        { name: 'Sparse vegetation', color: '#f1b555' },
        { name: 'Moderate vegetation', color: '#99b718' },
        { name: 'Dense vegetation', color: '#529400' },
        { name: 'Very dense vegetation', color: '#011301' }
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
    }
    return [];
  };

  const getTitle = () => {
    if (selectedLayer === 'ndvi') {
      return 'NDVI Legend';
    } else if (selectedLayer === 'lulc') {
      return 'Land Cover Classes';
    }
    return 'Legend';
  };

  const getDescription = () => {
    if (selectedLayer === 'ndvi') {
      return 'Vegetation index values range from -1 to 1. Higher values indicate healthier, denser vegetation.';
    } else if (selectedLayer === 'lulc') {
      return 'Land use and land cover classification based on satellite imagery analysis.';
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
                {selectedLayer === 'ndvi' ? '🌱' : '🗺️'}
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