import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

const MapController = ({ center, zoom }) => {
  const map = useMap(); // Get the map instance

  useEffect(() => {
    if (map && center && zoom) {
      map.setView(center, zoom); // Use setView() when props change
    }
  }, [map, center, zoom]); // Re-run effect when map, center, or zoom changes

  return null; // This component doesn't render anything
};

export default MapController;