import { useState } from 'react';

const ControlPanel = ({ 
  startDate, 
  endDate, 
  onDateChange, 
  onUpdateMap, 
  onLayerChange,
  isUpdating = false,
  error = null,
  selectedLayer
}) => {

  const handleBackToLayers = () => {
    onLayerChange(null);
  };

  const handleStartDateChange = (date) => {
    onDateChange({ startDate: date, endDate });
  };

  const handleEndDateChange = (date) => {
    onDateChange({ startDate, endDate: date });
  };

  const handleLayerChange = (layerType) => {
    onLayerChange(layerType);

  }

  const handlePresetDateRange = (preset) => {
    let start, end;
    const currentYear = new Date().getFullYear();
    
    switch (preset) {
      case '2020':
        start = '2020-01-01';
        end = '2020-12-31';
        break;
      case '2021':
        start = '2021-01-01';
        end = '2021-12-31';
        break;
      case '2022':
        start = '2022-01-01';
        end = '2022-12-31';
        break;
      case '2023':
        start = '2023-01-01';
        end = '2023-12-31';
        break;
      case 'last3years':
        start = `${currentYear - 3}-01-01`;
        end = `${currentYear - 1}-12-31`;
        break;
      default:
        return;
    }
    
    onDateChange({ startDate: start, endDate: end });
    onUpdateMap(start, end);
  };

  const layerOptions = [
    {
      id: 'ndvi',
      name: 'NDVI',
      fullName: 'Normalized Difference Vegetation Index',
      description: 'Measure of vegetation health and density using satellite imagery',
      color: '#22c55e',
      icon: '🌱'
    },
    {
      id: 'lulc',
      name: 'LULC',
      fullName: 'Land Use Land Cover',
      description: 'Classification of land surface into different cover types',
      color: '#3b82f6',
      icon: '🗺️'
    }
  ];

  const getLegendItems = () => {
    if (selectedLayer === 'ndvi') {
      return [
        { name: 'Very Low Vegetation', color: '#8B4513' },
        { name: 'Low Vegetation', color: '#DAA520' },
        { name: 'Moderate Vegetation', color: '#ADFF2F' },
        { name: 'High Vegetation', color: '#228B22' },
        { name: 'Very High Vegetation', color: '#006400' }
      ];
    } else if (selectedLayer === 'lulc') {
      return [
        { name: 'Water', color: '#1A5BAB' },
        { name: 'Trees', color: '#358221' },
        { name: 'Crops', color: '#FFDB5C' },
        { name: 'Built Area', color: '#ED022A' }
      ];
    }
    return [];
  };

  const presetYears = ['2020', '2021', '2022', '2023'];

  // Layer Selection View
  if (!selectedLayer) {
    return (
      <div style={{
        width: '320px',
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRight: '1px solid #dee2e6',
        overflowY: 'auto',
        height: '100vh'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{
            margin: '0 0 10px 0',
            fontSize: '20px',
            fontWeight: '600',
            color: '#343a40'
          }}>
            Earth Observation
          </h3>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#6c757d',
            lineHeight: '1.5'
          }}>
            Select a layer to explore Earth's surface data and patterns over time.
          </p>
        </div>

        {/* Layer Selection */}
        <div style={{ marginBottom: '30px' }}>
          <h4 style={{
            margin: '0 0 20px 0',
            fontSize: '16px',
            fontWeight: '500',
            color: '#495057'
          }}>
            Choose Data Layer
          </h4>
          
          <div style={{ display: 'grid', gap: '15px' }}>
            {layerOptions.map((layer) => (
              <button
                key={layer.id}
                onClick={() => handleLayerChange(layer.id)}
                style={{
                  padding: '20px',
                  backgroundColor: 'white',
                  border: '2px solid #e9ecef',
                  borderRadius: '12px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = layer.color;
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = `0 4px 12px rgba(0,0,0,0.1)`;
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = '#e9ecef';
                  e.target.style.transform = 'translateY(0px)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '5px'
                }}>
                  <span style={{ fontSize: '24px' }}>{layer.icon}</span>
                  <div>
                    <div style={{
                      fontWeight: '600',
                      fontSize: '16px',
                      color: '#343a40'
                    }}>
                      {layer.name}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: layer.color,
                      fontWeight: '500'
                    }}>
                      {layer.fullName}
                    </div>
                  </div>
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#6c757d',
                  lineHeight: '1.4'
                }}>
                  {layer.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Info Section */}
        <div style={{
          padding: '20px',
          backgroundColor: '#e7f3ff',
          borderRadius: '12px',
          fontSize: '13px',
          border: '1px solid #b8daff'
        }}>
          <div style={{
            fontWeight: '600',
            color: '#004085',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>ℹ️</span> Getting Started
          </div>
          <p style={{
            margin: 0,
            color: '#0056b3',
            lineHeight: '1.4'
          }}>
            Select a data layer above to begin exploring satellite imagery and analysis tools for your area of interest.
          </p>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '40px',
          paddingTop: '20px',
          borderTop: '1px solid #dee2e6',
          fontSize: '11px',
          color: '#6c757d',
          textAlign: 'center'
        }}>
          Powered by satellite data & Earth observation
        </div>
      </div>
    );
  }

  // Date Range Selection View (when layer is selected)
  return (
    <div style={{
      width: '320px',
      backgroundColor: '#f8f9fa',
      padding: '20px',
      borderRight: '1px solid #dee2e6',
      overflowY: 'auto',
      height: '100vh'
    }}>
      {/* Header with Back Button */}
      <div style={{ marginBottom: '25px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '10px'
        }}>
          <button
            onClick={handleBackToLayers}
            style={{
              padding: '6px 8px',
              backgroundColor: 'transparent',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#6c757d'
            }}
          >
            ← Back
          </button>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: '#343a40'
          }}>
            {layerOptions.find(l => l.id === selectedLayer)?.name} Controls
          </h3>
        </div>
        <p style={{
          margin: 0,
          fontSize: '13px',
          color: '#6c757d',
          lineHeight: '1.4'
        }}>
          Select date ranges to explore {layerOptions.find(l => l.id === selectedLayer)?.fullName.toLowerCase()} over time.
        </p>
      </div>
      
      {/* Error Display */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          fontSize: '13px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {/* Date Range Section */}
      <div style={{ marginBottom: '25px' }}>
        <h4 style={{
          margin: '0 0 15px 0',
          fontSize: '14px',
          fontWeight: '500',
          color: '#6c757d',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Custom Date Range
        </h4>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '5px',
            fontSize: '13px',
            fontWeight: '500',
            color: '#495057'
          }}>
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            disabled={isUpdating}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: isUpdating ? '#e9ecef' : 'white',
              cursor: isUpdating ? 'not-allowed' : 'text'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '5px',
            fontSize: '13px',
            fontWeight: '500',
            color: '#495057'
          }}>
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
            disabled={isUpdating}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: isUpdating ? '#e9ecef' : 'white',
              cursor: isUpdating ? 'not-allowed' : 'text'
            }}
          />
        </div>
        
        <button
          onClick={() => onUpdateMap(startDate, endDate)}
          disabled={isUpdating || !startDate || !endDate}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: isUpdating ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isUpdating ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          {isUpdating ? 'Updating...' : 'Apply Date Range'}
        </button>
      </div>
      
      {/* Preset Date Ranges */}
      <div style={{ marginBottom: '25px', display:'none' }}>
        <h4 style={{
          margin: '0 0 15px 0',
          fontSize: '14px',
          fontWeight: '500',
          color: '#6c757d',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Quick Select
        </h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          {presetYears.map((year) => (
            <button
              key={year}
              onClick={() => handlePresetDateRange(year)}
              disabled={isUpdating}
              style={{
                padding: '8px 12px',
                backgroundColor: 'white',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: isUpdating ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isUpdating) {
                  e.target.style.backgroundColor = '#f8f9fa';
                  e.target.style.borderColor = '#adb5bd';
                }
              }}
              onMouseLeave={(e) => {
                if (!isUpdating) {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.borderColor = '#dee2e6';
                }
              }}
            >
              {year}
            </button>
          ))}
        </div>
        
        <button
          onClick={() => handlePresetDateRange('last3years')}
          disabled={isUpdating}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: '#e9ecef',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: isUpdating ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!isUpdating) {
              e.target.style.backgroundColor = '#dee2e6';
              e.target.style.borderColor = '#adb5bd';
            }
          }}
          onMouseLeave={(e) => {
            if (!isUpdating) {
              e.target.style.backgroundColor = '#e9ecef';
              e.target.style.borderColor = '#ced4da';
            }
          }}
        >
          Last 3 Years
        </button>
      </div>
      
      {/* Current Selection Display */}
      {startDate && endDate && (
        <div style={{
          padding: '15px',
          backgroundColor: '#e7f3ff',
          borderRadius: '4px',
          fontSize: '13px',
          marginBottom: '25px',
          border: '1px solid #b8daff'
        }}>
          <div style={{ marginBottom: '5px', fontWeight: '500', color: '#004085' }}>
            Current Selection:
          </div>
          <div style={{ color: '#0056b3' }}>
            {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
          </div>
          <div style={{ marginTop: '5px', fontSize: '12px', color: '#6c757d' }}>
            Duration: {Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))} days
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div>
        <h4 style={{
          margin: '0 0 15px 0',
          fontSize: '14px',
          fontWeight: '500',
          color: '#6c757d',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {selectedLayer === 'ndvi' ? 'Vegetation Index Legend' : 'Land Cover Legend'}
        </h4>
        
        <div style={{ display: 'grid', gap: '8px' }}>
          {getLegendItems().map((item) => (
            <div key={item.name} style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px 8px',
              backgroundColor: 'white',
              borderRadius: '4px',
              fontSize: '12px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: item.color,
                marginRight: '10px',
                borderRadius: '2px',
                border: '1px solid rgba(0,0,0,0.1)',
                flexShrink: 0
              }}></div>
              <span style={{ fontWeight: '500' }}>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <div style={{
        marginTop: '30px',
        paddingTop: '20px',
        borderTop: '1px solid #dee2e6',
        fontSize: '11px',
        color: '#6c757d',
        textAlign: 'center'
      }}>
        {selectedLayer === 'ndvi' ? 'NDVI data from satellite imagery' : 'Data from ESRI Global Land Use Land Cover'}
      </div>
    </div>
  );
};

export default ControlPanel;