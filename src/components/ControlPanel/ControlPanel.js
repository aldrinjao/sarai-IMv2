const ControlPanel = ({
  startDate,
  endDate,
  onDateChange,
  onUpdateMap,
  onLayerChange,
  isUpdating = false,
  error = null,
  regions,
  selectedLayer,
  selectedRegion,
  selectedProvince,
  selectedMunicipality,
  onRegionChange,
  onProvinceChange,
  onMunicipalityChange,
  provinces = [],
  municipalities = []
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

  const layerOptions = [
    {
      id: 'ndvi',
      name: 'NDVI',
      fullName: 'Vegetation Index',
      description: 'Vegetation health and density, with time series analysis',
      color: '#22c55e',
      icon: '🌱',
      features: ['Time Series', 'Calendar Patterns', 'Animation']
    },
    {
      id: 'lulc',
      name: 'LULC',
      fullName: 'Land Use / Land Cover',
      description: 'Classification of the land surface into cover types',
      color: '#3b82f6',
      icon: '🗺️',
      features: ['Land Classification', 'Cover Types', 'Static Analysis']
    },
    {
      id: 'flood',
      name: 'Flood',
      fullName: 'Flood Mapping',
      description: 'Sentinel-1 SAR flood extent detection',
      color: '#0ea5e9',
      icon: '🌊',
      features: ['SAR Detection', 'Before / After', 'Flood Extent']
    },
    {
      id: 'rainfall',
      name: 'Rainfall',
      fullName: 'Near-Real-Time Rainfall',
      description: 'GSMaP accumulated precipitation (~4h latency)',
      color: '#6366f1',
      icon: '🌧️',
      features: ['Near Real Time', 'Accumulated mm', 'Hourly Source']
    }
  ];

  const presetYears = ['2020', '2021', '2022', '2023'];

  // Layer Selection View — compact grid sized to fit without scrolling
  if (!selectedLayer) {
    return (
      <div style={{
        width: '320px',
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRight: '1px solid #dee2e6',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{
            margin: '0 0 6px 0',
            fontSize: '24px',
            fontWeight: '600',
            color: '#343a40'
          }}>
            SARAI Maps
          </h3>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: '#6c757d',
            lineHeight: '1.4'
          }}>
            Select a layer to explore satellite imagery and analysis tools.
          </p>
        </div>

        {/* Layer Selection — 2-column grid */}
        <h4 style={{
          margin: '0 0 12px 0',
          fontSize: '12px',
          fontWeight: '600',
          color: '#6c757d',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Choose Data Layer
        </h4>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px'
        }}>
          {layerOptions.map((layer) => (
            <button
              key={layer.id}
              onClick={() => handleLayerChange(layer.id)}
              title={layer.description}
              style={{
                padding: '16px 12px',
                backgroundColor: 'white',
                border: '2px solid #e9ecef',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                minHeight: '104px',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = layer.color;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e9ecef';
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span style={{ fontSize: '30px', lineHeight: 1 }}>{layer.icon}</span>
              <div style={{
                fontWeight: '700',
                fontSize: '15px',
                color: '#343a40'
              }}>
                {layer.name}
              </div>
              <div style={{
                fontSize: '11px',
                color: layer.color,
                fontWeight: '600',
                lineHeight: '1.2'
              }}>
                {layer.fullName}
              </div>
            </button>
          ))}
        </div>

        {/* Info Section — compact */}
        <div style={{
          marginTop: '16px',
          padding: '12px 14px',
          backgroundColor: '#e7f3ff',
          borderRadius: '10px',
          fontSize: '12px',
          border: '1px solid #b8daff'
        }}>
          <div style={{
            fontWeight: '600',
            color: '#004085',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>ℹ️</span> Getting Started
          </div>
          <p style={{ margin: 0, color: '#0056b3', lineHeight: '1.4' }}>
            Tap a layer to configure its region and date range. NDVI adds time
            series and animation; Rainfall shows near-real-time precipitation.
          </p>
        </div>

        {/* Footer — pinned to bottom */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '16px',
          borderTop: '1px solid #dee2e6',
          fontSize: '11px',
          color: '#6c757d',
          textAlign: 'center'
        }}>
          Powered by Google Earth Engine
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
          Configure parameters for {layerOptions.find(l => l.id === selectedLayer)?.fullName.toLowerCase()} analysis.
        </p>
        
        {/* Layer-specific info */}
        {selectedLayer === 'ndvi' && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: '#d4edda',
            borderRadius: '8px',
            fontSize: '12px',
            border: '1px solid #c3e6cb'
          }}>
            <div style={{
              fontWeight: '600',
              color: '#155724',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>🕒</span> Time Series Enabled
            </div>
            <p style={{
              margin: 0,
              color: '#155724',
              lineHeight: '1.3'
            }}>
              This layer includes temporal analysis, calendar patterns, and animation controls for vegetation monitoring over time.
            </p>
          </div>
        )}
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

      {/* Location Selection */}
      <div style={{ marginBottom: '25px' }}>
        <h4 style={{
          margin: '0 0 15px 0',
          fontSize: '14px',
          fontWeight: '500',
          color: '#6c757d',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Location Selection
        </h4>

        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '5px',
            fontSize: '13px',
            fontWeight: '500',
            color: '#495057'
          }}>
            Region
          </label>
          <select
            value={selectedRegion || ''}
            onChange={(e) => onRegionChange(e.target.value)}
            disabled={isUpdating}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: isUpdating ? '#e9ecef' : 'white',
              cursor: isUpdating ? 'not-allowed' : 'pointer'
            }}
          >
            <option value="">All</option>
            {regions.map((region) => (
              <option key={region.ADM1_PCODE} value={region.ADM1_PCODE}>
                {region.ADM1_EN}
              </option>
            ))}
          </select>
        </div>

        {selectedRegion && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{
              display: 'block',
              marginBottom: '5px',
              fontSize: '13px',
              fontWeight: '500',
              color: '#495057'
            }}>
              Province
            </label>
            <select
              value={selectedProvince || ''}
              onChange={(e) => onProvinceChange(e.target.value)}
              disabled={isUpdating}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: isUpdating ? '#e9ecef' : 'white',
                cursor: isUpdating ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="">All</option>
              {provinces.map((province) => (
                <option key={province.ADM2_PCODE} value={province.ADM2_PCODE}>
                  {province.ADM2_EN}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedProvince && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{
              display: 'block',
              marginBottom: '5px',
              fontSize: '13px',
              fontWeight: '500',
              color: '#495057'
            }}>
              Municipality
            </label>
            <select
              value={selectedMunicipality || ''}
              onChange={(e) => onMunicipalityChange(e.target.value)}
              disabled={isUpdating}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: isUpdating ? '#e9ecef' : 'white',
                cursor: isUpdating ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="">Entire Province</option>
              {municipalities.map((municipality) => (
                <option key={municipality.ADM3_PCODE} value={municipality.ADM3_PCODE}>
                  {municipality.ADM3_EN}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

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
          Date Range
          {selectedLayer === 'ndvi' && (
            <span style={{
              marginLeft: '8px',
              fontSize: '10px',
              background: '#22c55e20',
              color: '#22c55e',
              padding: '2px 6px',
              borderRadius: '8px',
              fontWeight: '500',
              textTransform: 'none'
            }}>
              Time Series
            </span>
          )}
        </h4>

        {selectedLayer === 'ndvi' && (
          <div style={{
            marginBottom: '15px',
            padding: '12px',
            backgroundColor: '#fff3cd',
            borderRadius: '8px',
            fontSize: '12px',
            border: '1px solid #ffeaa7'
          }}>
            <div style={{
              fontWeight: '600',
              color: '#856404',
              marginBottom: '4px'
            }}>
              💡 Tip for Time Series Analysis
            </div>
            <p style={{
              margin: 0,
              color: '#856404',
              lineHeight: '1.3'
            }}>
              Use a date range of 1-2 years for optimal time series visualization and calendar pattern analysis.
            </p>
          </div>
        )}

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
          {isUpdating ? 'Updating...' : 'Apply Changes'}
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
          <div style={{ color: '#0056b3', marginBottom: '5px' }}>
            <strong>Region:</strong> {selectedMunicipality ? municipalities.find(m => m.ADM3_PCODE === selectedMunicipality)?.ADM3_EN : selectedProvince ? provinces.find(p => p.ADM2_PCODE === selectedProvince)?.ADM2_EN : selectedRegion ? regions.find(r => r.ADM1_PCODE === selectedRegion)?.ADM1_EN : 'Philippines'}
          </div>
          <div style={{ color: '#0056b3', marginBottom: '5px' }}>
            <strong>Period:</strong> {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
          </div>
          <div style={{ fontSize: '12px', color: '#6c757d' }}>
            Duration: {Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))} days
            {selectedLayer === 'ndvi' && (
              <span style={{ display: 'block', marginTop: '4px', color: '#22c55e', fontWeight: '500' }}>
                📊 Time series analysis enabled
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: '30px',
        paddingTop: '20px',
        borderTop: '1px solid #dee2e6',
        fontSize: '11px',
        color: '#6c757d',
        textAlign: 'center'
      }}>
        {selectedLayer === 'ndvi'
          ? 'MODIS NDVI satellite data with time series'
          : selectedLayer === 'lulc'
            ? 'ESRI Global Land Use Land Cover data'
            : selectedLayer === 'flood'
              ? 'Sentinel-1 SAR flood mapping (UN-SPIDER method)'
              : 'JAXA GSMaP near-real-time rainfall data'}
      </div>
    </div>
  );
};

export default ControlPanel;