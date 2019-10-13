import * as http from 'http';
import mapboxgl from 'mapbox-gl';
// @ts-ignore
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';

const { mapbox, darksky } = require("./config.json");

export function buildMap() {
  mapboxgl.accessToken = mapbox, darksky;
  var map = new mapboxgl.Map({
    container: 'app',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [-79.4512, 43.6568],
    zoom: 13
  });

  map.addControl(new MapboxDirections({
    accessToken: mapboxgl.accessToken
  }), 'top-left');
}

function weatherbylocation(latitude: number, longitude: number, cb: (res: any) => any): void {
  let opts = {
    'host': 'https://api.darksky.net/forecast/',
    'path': `${darksky}/${latitude},${longitude}/?exclude=[minutely,hourly,daily,alerts,flags]`
  };

  http.request(opts, (r: http.IncomingMessage): void => {
    let data = '';
    r.on('data', (chunk: string): void => {
      console.log('Got chunk: ' + chunk);
      data += chunk;
    });
    r.on('end', (): void => {
      console.log('Response has ended');
      console.log(data);
      cb(data);
    });
    r.on('error', (err): void => {
      console.log('Following error occured during request:\n');
      console.log(err);
    })
  }).end();
}