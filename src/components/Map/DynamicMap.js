import 'leaflet/dist/leaflet.css';

import * as ReactLeaflet from 'react-leaflet';

import { Marker, Popup, useMapEvents } from 'react-leaflet';
import { useEffect, useState } from 'react';

import Leaflet from 'leaflet';
import MapController from './MapController'; // Import the new controller
import styles from './Map.module.scss';

const { MapContainer } = ReactLeaflet;

function LocationMarker() {
  const [position, setPosition] = useState(null)
  const map = useMapEvents({
    click(e) {
      console.log(e.latlng);
    }
  })
}

const Map = ({ children, className, center, zoom, ...rest }) => { // Accept center and zoom props
  let mapClassName = styles.map;

  if (className) {
    mapClassName = `${mapClassName} ${className}`;
  }

  return (
    <MapContainer className={mapClassName} center={center} zoom={zoom} {...rest} >
      <LocationMarker />
      <MapController center={center} zoom={zoom} /> {/* Render the controller here */}
      {children(ReactLeaflet, Leaflet)}
    </MapContainer>
  )
}

export default Map;