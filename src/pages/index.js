import { useEffect, useState } from 'react';

import Layout from '@components/Layout';
import Map from '@components/Map';
import Section from '@components/Section';
import axios from 'axios';
import styles from '@styles/Home.module.scss';

const DEFAULT_CENTER = [12, 120.036546]
const DEFAULT_ZOOM = 6;
const MAX_BOUNDS = [
  [21.063944194047764,134.95605468750003],
  [2.9349970669152285, 105.38085937500001],
];
export default function Home() {


  const [mapUrl, setMapUrl] = useState('');

  useEffect(() => {
    const options = {
      method: 'GET',
      url: 'http://localhost:3000/api/lulc',
    };

    let url = "";

    // axios.request(options).then(function (response) {

    //   console.log(response.data);
    //   setMapUrl(response.data.urlFormat);
    // }).catch(function (error) { });

  }, []);

  return (

    <Layout>
      <Map className={styles.homeMap} center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} minZoom={DEFAULT_ZOOM} maxBounds={MAX_BOUNDS} >
        {({ TileLayer, Marker, Popup }) => (
          <>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"

            />
            <TileLayer
              url={mapUrl}

            />

          </>
        )}
      </Map>
    </Layout>

  )
}
