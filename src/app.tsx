import * as http from 'http';
import mapboxgl, { MapTouchEvent } from 'mapbox-gl';
// @ts-ignore
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';

import { Directions, Route, RouteLeg, RouteStep } from './directions';

const { mapbox, darksky } = require("./config.json");

// distance to take another weather measurement, in meters
const maxInterpDist = 50000;
// minimum number of interpolations to take
const minInterpSteps = 4;

export function buildMap() {
  mapboxgl.accessToken = mapbox, darksky;
  let map = new mapboxgl.Map({
    container: 'app',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [-79.4512, 43.6568],
    zoom: 13
  });

  let mapDir = new MapboxDirections({
    accessToken: mapboxgl.accessToken
  })
  map.addControl(mapDir, 'top-left');

  mapDir.on("route", (_: any) => {
    let origin = mapDir.getOrigin().geometry.coordinates;
    let dest = mapDir.getDestination().geometry.coordinates;

    processDrivingDirs([origin, dest], (resp: Directions) => {
      let routes = resp.routes;

      routes.forEach((route: Route) => {
        let travelled = 0;
        let interpDist = Math.min(route.distance / minInterpSteps, maxInterpDist);
        console.log(interpDist);

        route.legs.forEach((leg: RouteLeg) => {
          let prevIntersection: { location: [number, number] } = { location: origin };

          leg.steps.forEach((step: RouteStep) => {
            travelled += step.distance;

            if (travelled > interpDist) {
              const prev = travelled - step.distance;
              let remain = interpDist - prev;

              step.intersections.forEach((item: { location: [number, number] }) => {
                let apd = approxDist(prevIntersection.location, item.location);
                remain = remain - apd;
                console.log("approx: " + apd);
                console.log("remain: " + remain);

                if (remain < 0) {
                  // calculate weather here
                  console.log(item.location);
                  console.log(remain);

                  // reset diff in case we cross multiple interpDist in one stretch
                  remain += interpDist;
                }

                prevIntersection = item;
              });

              console.log(`travelled ${travelled} meters, ${remain} until next interp`);

              travelled = remain;
            }
            else {
              prevIntersection = step.intersections[step.intersections.length - 1];
            }
          })
        })
      });
    })
  });
}

// approximate the distance between two lon/lat pair
function approxDist(pos1: [number, number], pos2: [number, number]) {
  var R = 6371e3; // metres
  var φ1 = pos1[1] * Math.PI / 180;
  var φ2 = pos2[1] * Math.PI / 180;
  var Δφ = (pos2[1] - pos1[1]) * Math.PI / 180;
  var Δλ = (pos2[0] - pos1[0]) * Math.PI / 180;

  var a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function processDrivingDirs(coords: [number, number][], cb: (res: any) => any): void {
  let str_coords = coords.reduce((accum: string, val: [number, number]) => accum + "%3B" + val[0] + "%2C" + val[1], "");
  str_coords = str_coords.slice(3);

  let opts = {
    'path': `https://api.mapbox.com/directions/v5/mapbox/driving/${str_coords}.json?access_token=${mapbox}&alternatives=true&steps=true`
  }

  http.request(opts, (r: http.IncomingMessage): void => {
    let data = '';
    r.on('data', (chunk: string): void => {
      data += chunk;
    });
    r.on('end', (): void => {
      console.log('Response has ended');
      cb(JSON.parse(data));
    });
    r.on('error', (err): void => {
      console.log('Following error occured during request:\n');
      console.log(err);
    })
  }).end();
}

function processWeatherLocs(longitude: number, latitude: number, cb: (res: any) => any): void {
  let opts = {
    'host': 'https://api.darksky.net/forecast/',
    'path': `${darksky}/${latitude},${longitude}/?exclude=[minutely, hourly, daily, alerts, flags]`
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