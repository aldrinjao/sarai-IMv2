import 'leaflet/dist/leaflet.css';

import * as ReactLeaflet from 'react-leaflet';

import { Marker, Popup, useMapEvents } from 'react-leaflet';
import { useEffect, useState } from 'react';

import Leaflet from 'leaflet';
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


const Map = ({ children, className, width, height, ...rest }) => {

  let mapClassName = styles.map;

  if (className) {
    mapClassName = `${mapClassName} ${className}`;
  }

  return (
    <MapContainer className={mapClassName} {...rest} >
      <LocationMarker />

      {children(ReactLeaflet, Leaflet)}
    </MapContainer>
  )
}

export default Map;
