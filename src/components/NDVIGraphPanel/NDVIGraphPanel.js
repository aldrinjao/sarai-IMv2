import { useEffect, useRef } from 'react';

import Chart from 'chart.js/auto'; // Import Chart.js with auto registration

const NDVIGraphPanel = ({ 
  calendarDayAverages, 
  isVisible, 
  onToggle, 
  selectedDate,
  metadata 
}) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Get current date's calendar day for reference line
  const getCurrentCalendarDay = () => {
    if (!selectedDate) return null;
    
    const date = new Date(selectedDate);
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const calendarDay = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    // Normalize for leap year
    const isLeapYear = (date.getFullYear() % 4 === 0 && date.getFullYear() % 100 !== 0) || (date.getFullYear() % 400 === 0);
    return isLeapYear && calendarDay > 59 ? calendarDay - 1 : calendarDay;
  };

  // Format calendar day averages for the chart
  const formatChartData = () => {
    if (!calendarDayAverages || calendarDayAverages.length === 0) {
      return { labels: [], datasets: [] };
    }

    const sortedData = [...calendarDayAverages].sort((a, b) => a.calendarDay - b.calendarDay);
    const labels = sortedData.map(item => item.calendarDay);
    const meanData = sortedData.map(item => item.ndvi_mean);
    const medianData = sortedData.map(item => item.ndvi_median);

    return {
      labels,
      datasets: [
        {
          label: 'Multi-year Average',
          data: meanData,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4
        },
        {
          label: 'Multi-year Median',
          data: medianData,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 1.5,
          borderDash: [4, 4],
          fill: false,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4
        }
      ]
    };
  };

  // Initialize/update chart
  useEffect(() => {
    if (!chartRef.current || !isVisible) {
      // Clean up if not visible
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
      return;
    }

    const ctx = chartRef.current.getContext('2d');
    const chartData = formatChartData();
    const currentDay = getCurrentCalendarDay();

    // Always destroy existing chart first
    if (chartInstance.current) {
      try {
        chartInstance.current.destroy();
        chartInstance.current = null;
      } catch (e) {
        console.warn('Error destroying chart:', e);
      }
    }

    // Clear the canvas completely
    if (ctx) {
      ctx.clearRect(0, 0, chartRef.current.width, chartRef.current.height);
    }

    if (chartData.labels.length === 0) {
      return;
    }

    // Register Chart.js components - with auto import, this should be automatic
    // But let's keep it simple and rely on the auto import

    // Create new chart with a small delay to ensure cleanup is complete
    setTimeout(() => {
      try {
        if (!chartRef.current) return; // Component might have unmounted

        // Try creating chart - Chart.js with auto import should work directly
        try {
          chart = new Chart(chartRef.current, {
            type: 'line',
            data: chartData,
            options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: {
                duration: 0 // Disable animations to prevent conflicts
              },
              interaction: {
                intersect: false,
                mode: 'index'
              },
              plugins: {
                legend: {
                  display: false // We'll create custom legend
                },
                tooltip: {
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderColor: '#dee2e6',
                  borderWidth: 1,
                  titleColor: '#343a40',
                  bodyColor: '#6c757d',
                  cornerRadius: 6,
                  displayColors: true,
                  callbacks: {
                    title: (context) => {
                      const day = context[0].label;
                      const date = new Date(2023, 0, day);
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      return `Day ${day} (${monthNames[date.getMonth()]} ${date.getDate()})`;
                    },
                    label: (context) => {
                      const value = context.parsed.y;
                      const dataPoint = calendarDayAverages.find(item => item.calendarDay == context.label);
                      let label = `${context.dataset.label}: ${value?.toFixed(3)}`;
                      if (dataPoint && dataPoint.sampleCount && context.dataset.label === 'Multi-year Average') {
                        label += ` (${dataPoint.sampleCount} samples)`;
                      }
                      return label;
                    }
                  }
                }
              },
              scales: {
                x: {
                  type: 'linear',
                  position: 'bottom',
                  min: 1,
                  max: 365,
                  ticks: {
                    stepSize: 30,
                    callback: function(value) {
                      const date = new Date(2023, 0, value);
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      return monthNames[date.getMonth()];
                    },
                    font: {
                      size: 10
                    },
                    color: '#6c757d'
                  },
                  grid: {
                    color: '#e9ecef',
                    drawBorder: false
                  }
                },
                y: {
                  min: 0,
                  max: 1,
                  ticks: {
                    stepSize: 0.2,
                    callback: function(value) {
                      return value.toFixed(1);
                    },
                    font: {
                      size: 10
                    },
                    color: '#6c757d'
                  },
                  grid: {
                    color: '#e9ecef',
                    drawBorder: false
                  },
                  title: {
                    display: true,
                    text: 'NDVI',
                    font: {
                      size: 11
                    },
                    color: '#6c757d'
                  }
                }
              }
            }
          });

          // Add reference line after chart creation
          if (currentDay && currentDay >= 1 && currentDay <= 365) {
            const plugin = {
              id: 'referenceLines',
              beforeDraw: (chart) => {
                const ctx = chart.ctx;
                const xScale = chart.scales.x;
                const yScale = chart.scales.y;
                const xPos = xScale.getPixelForValue(currentDay);
                
                ctx.save();
                ctx.strokeStyle = '#ff6b35';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.moveTo(xPos, yScale.top);
                ctx.lineTo(xPos, yScale.bottom);
                ctx.stroke();
                ctx.restore();
              }
            };
            
            // Register the plugin manually
            Chart.register(plugin);
          }

        } catch (error) {
          console.error('Chart creation failed:', error);
          throw error;
        }

        chartInstance.current = chart;

      } catch (error) {
        console.error('Error creating chart:', error);

      }
    }, 10); // Small delay to ensure cleanup

    return () => {
      if (chartInstance.current) {
        try {
          chartInstance.current.destroy();
          chartInstance.current = null;
        } catch (e) {
          console.warn('Error destroying chart in cleanup:', e);
        }
      }
    };
  }, [calendarDayAverages, selectedDate, isVisible]);

  const currentDay = getCurrentCalendarDay();

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          top: '20px',
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
        title="Show NDVI Graph"
        onMouseEnter={(e) => {
          e.target.style.background = 'rgba(255, 255, 255, 1)';
          e.target.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'rgba(255, 255, 255, 0.95)';
          e.target.style.transform = 'scale(1)';
        }}
      >
        <span>📊</span>
        NDVI Graph
      </button>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      width: '450px',
      height: '400px',
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px' 
      }}>
        <div>
          <h4 style={{
            margin: '0 0 4px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: '#343a40',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>🌱</span>
            NDVI Calendar Pattern
          </h4>
          <p style={{
            margin: 0,
            fontSize: '11px',
            color: '#6c757d',
            lineHeight: '1.3'
          }}>
            Multi-year NDVI averages by calendar day (1-365)
          </p>
        </div>
        <button
          onClick={onToggle}
          style={{
            background: 'transparent',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: '12px',
            color: '#6c757d'
          }}
        >
          ×
        </button>
      </div>

      {/* Chart */}
      <div style={{ height: '280px', width: '100%' }}>
        {calendarDayAverages && calendarDayAverages.length > 0 ? (
          <canvas 
            ref={chartRef}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6c757d',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
              No time series data available.<br />
              Select a longer date range to see the calendar pattern.
            </div>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div style={{
        paddingTop: '12px',
        borderTop: '1px solid #e9ecef',
        fontSize: '10px',
        color: '#6c757d',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          {metadata && (
            <span>
              {metadata.dateRange?.start} to {metadata.dateRange?.end}
              {metadata.totalImages && ` • ${metadata.totalImages} images`}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ 
              width: '12px', 
              height: '2px', 
              backgroundColor: '#22c55e' 
            }}></div>
            <span>Mean</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ 
              width: '12px', 
              height: '2px', 
              backgroundColor: '#3b82f6',
              borderTop: '1px dashed #3b82f6',
              borderBottom: '1px dashed #3b82f6'
            }}></div>
            <span>Median</span>
          </div>
          {currentDay && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ 
                width: '12px', 
                height: '2px', 
                backgroundColor: '#ff6b35',
                borderTop: '1px dashed #ff6b35'
              }}></div>
              <span>Current</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NDVIGraphPanel;