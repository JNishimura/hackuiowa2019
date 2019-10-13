import * as http from 'http';
import mapboxgl, { LngLat } from 'mapbox-gl';

// @ts-ignore
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';

import { Directions, Route, RouteLeg, RouteStep } from './directions';
import PointProps from './PointProps';

const { mapbox, darksky } = require("./config.json");

const icons_map = {
  "clear-day": "wi wi-day-sunny",
  "clear-night": "wi wi-night-clear",
  "rain": "wi wi-rain",
  "snow": "wi wi-snow",
  "sleet": "wi wi-sleet",
  "wind": "wi wi-strong-wind",
  "fog": "wi wi-fog",
  "cloudy": "wi wi-cloudy",
  "partly-cloudy-day": "wi wi-day-cloudy",
  "partly-cloudy-night": "wi wi-night-alt-cloudy",
}

// distance to take another weather measurement, in meters
const maxInterpDist = 50000;
// minimum number of interpolations to take
const minInterpSteps = 4;

// evaluation thresholds
const minPrecipProb = 0.50;
const minPrecipThresh = 0.50;

export function buildMap() {
  mapboxgl.accessToken = mapbox, darksky;
  let map = new mapboxgl.Map({
    container: 'app',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [-79.4512, 43.6568],
    zoom: 13
  });

  let mapDir = new MapboxDirections({
    accessToken: mapboxgl.accessToken,
    profile: "mapbox/driving",
    controls: {
      instructions: false
    }
  })
  map.addControl(mapDir, 'top-left');

  let pointSource = {
    "type": "FeatureCollection",
    "features": []
  } as GeoJSON.FeatureCollection;

  let routeSources = {
    "type": "FeatureCollection",
    "features": []
  } as GeoJSON.FeatureCollection;

  let weatherPointLayer = {
    "id": "wpl",
    "type": "circle",
    "source": "weatherPoints",
    "paint": {
      "circle-radius": 8,
      "circle-opacity": 1,
      "circle-color": ['get', 'color'],
    }
  } as mapboxgl.Layer;

  let routeLayer = {
    "id": "rl",
    "type": "line",
    "source": "routeSources",
    "paint": {
      "line-color": ['get', 'color'],
      "line-width": 6,
      "line-opacity": 0.6,
    }
  } as mapboxgl.Layer;


  map.on("load", (_: any) => {
    map.addSource('weatherPoints', { type: 'geojson', data: pointSource });
    map.addSource('routeSources', { type: 'geojson', data: routeSources });
    map.addLayer(weatherPointLayer);
    map.addLayer(routeLayer);

    let z = 2;
    let x = 2;
    let y = 1;

    let t = Math.pow(2, z);
    x = ((x % t) + t) % t;
    y = ((y % t) + t) % t;

    let s = 256 / t;
    let sw = {
      x: x * s,
      y: (y * s) + s
    };
    let ne = {
      x: x * s + s,
      y: (y * s)
    };

    getRadarUrl(z, x, y, (url: any) => {
      const swLat = fromPointToLatLng(sw);
      const neLat = fromPointToLatLng(ne);

      map.addSource("radarSource", {
        "type": "image",
        "url": url,
        "coordinates": [
          [swLat.lng, neLat.lat],
          [neLat.lng, neLat.lat],
          [neLat.lng, swLat.lat],
          [swLat.lng, swLat.lat],
        ]
      });

      map.addLayer({
        "id": "overlay",
        "source": "radarSource",
        "type": "raster",
        "paint": {
          "raster-opacity": 0.85
        }
      });
    });
  });

  mapDir.on("route", (_: any) => {
    let origin = mapDir.getOrigin().geometry.coordinates;
    let dest = mapDir.getDestination().geometry.coordinates;

    processDrivingDirs([origin, dest], (resp: Directions) => {
      let routes = resp.routes;
      pointSource.features = [];
      routeSources.features = [];

      routes.forEach((route: Route, route_index: number) => {
        let travelled = 0;
        let interpDist = Math.min(route.distance / minInterpSteps, maxInterpDist);
        console.log(interpDist);

        let color = "#" + ((1 << 24) * Math.random() | 0).toString(16);

        routeSources.features[route_index] = ({
          "type": "Feature",
          "geometry": {
            "type": "LineString",
            "coordinates": [origin]
          },
          "properties": { "color": color }
        });

        route.legs.forEach((leg: RouteLeg) => {
          let prevIntersection: LngLat = new LngLat(origin[0], origin[1]);

          leg.steps.forEach((step: RouteStep) => {
            travelled += step.distance;

            if (travelled > interpDist) {
              const prev = travelled - step.distance;
              let remain = interpDist - prev;

              step.intersections.forEach((item: { location: [number, number] }) => {
                const currIntersection = new LngLat(item.location[0], item.location[1]);

                // @ts-ignore, ts doesn't like that coordinates isn't in the typedef
                routeSources.features[route_index].geometry.coordinates.push(item.location);

                let apd = approxDist(prevIntersection, currIntersection);
                remain = remain - apd;
                console.log("approx: " + apd);
                console.log("remain: " + remain);

                if (remain < 0) {
                  // calculate weather here
                  console.log(currIntersection);
                  console.log(remain);

                  let pointProps = new PointProps(color);

                  processWeatherLocs(currIntersection, (weather: any) => {
                    const currWeather = weather["currently"];
                    pointProps["icon"] = currWeather["icon"];
                    pointProps["precipProb"] = currWeather["precipProbability"];
                    pointProps["precipIntensity"] = currWeather["precipIntensity"];
                    pointProps["precipType"] = currWeather["precipType"];
                    pointProps["summary"] = currWeather["summary"];

                    scoreConditions(pointProps);

                    pointSource.features.push({
                      "type": "Feature",
                      "geometry": {
                        "type": "Point",
                        "coordinates": item.location
                      },
                      "properties": pointProps
                    });

                    (map.getSource('weatherPoints') as any).setData(pointSource);
                  });

                  // reset diff in case we cross multiple interpDist in one stretch
                  remain += interpDist;
                }

                prevIntersection = currIntersection;
              });

              console.log(`travelled ${travelled} meters, ${remain} until next interp`);

              travelled = remain;
            }
            else {
              let temp = step.intersections[step.intersections.length - 1];
              prevIntersection = new LngLat(temp.location[0], temp.location[1]);

              step.intersections.forEach((item: { location: [number, number] }) => {
                // @ts-ignore, ts doesn't like that coordinates isn't in the typedef
                routeSources.features[route_index].geometry.coordinates.push(item.location);
              });
            }
          })
        });

        // @ts-ignore, ts doesn't like that coordinates isn't in the typedef
        routeSources.features[route_index].geometry.coordinates.push(dest);
      });

      (map.getSource('routeSources') as any).setData(routeSources);
    });
  });

  // clear weather points
  mapDir.on("clear", (_: any) => {
    pointSource.features = [];
    routeSources.features = [];
    (map.getSource('weatherPoints') as any).setData(pointSource);
    (map.getSource('routeSources') as any).setData(routeSources);
  });

  // Popup for showing info at a point
  const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false
  });

  map.on('mouseenter', 'wpl', function (e) {
    if (e.features == undefined)
      return;

    // Change the cursor style as a UI indicator.
    map.getCanvas().style.cursor = 'pointer';

    console.log(e.features[0].properties);

    // @ts-ignore
    let coordinates = e.features[0].geometry.coordinates.slice();
    let props = e.features[0].properties as any;

    // Ensure that if the map is zoomed out such that multiple
    // copies of the feature are visible, the popup appears
    // over the copy being pointed to.
    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
      coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
    }

    let topElem = document.createElement("div");
    let elem = document.createElement("span");
    topElem.style.fontSize = "14";

    // @ts-ignore
    elem.className = icons_map[props.icon];
    topElem.appendChild(elem);
    topElem.appendChild(document.createTextNode(` ${props.summary}\n ${props.precipProb * 100}% chance to rain\n ${props.precipIntensity} inches / hour`));
    console.log(topElem.innerHTML);

    // Populate the popup and set its coordinates
    // based on the feature found.
    popup.setLngLat(coordinates)
      .setDOMContent(topElem)
      .addTo(map);
  });

  map.on('mouseleave', 'wpl', function () {
    map.getCanvas().style.cursor = '';
    popup.remove();
  });
}

function fromPointToLatLng(point: { x: number, y: number }) {
  return {
    lat: (2 * Math.atan(Math.exp((point.y - 126) / -(256 / (2 * Math.PI)))) -
      Math.PI / 2) / (Math.PI / 180),
    lng: (point.x + 32) / (256 / 360)
  };
}

// approximate the distance between two lon/lat pair
function approxDist(pos1: LngLat, pos2: LngLat) {
  var R = 6371e3; // metres
  var φ1 = pos1.lat * Math.PI / 180;
  var φ2 = pos2.lat * Math.PI / 180;
  var Δφ = (pos2.lat - pos1.lat) * Math.PI / 180;
  var Δλ = (pos2.lng - pos1.lng) * Math.PI / 180;

  var a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// update color when conditions are bad
function scoreConditions(pointProps: PointProps): void {
  let score = 0;

  if (pointProps.precipIntensity > minPrecipThresh)
    score++;

  if (pointProps.precipProb > minPrecipProb)
    score++;

  if (score == 1)
    pointProps.color = "yellow";

  if (score == 2)
    pointProps.color = "red";
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

function processWeatherLocs(pos: LngLat, cb: (res: any) => any): void {
  let opts = {
    'path': `https://cors-anywhere.herokuapp.com/https://api.darksky.net/forecast/${darksky}/${pos.lat},${pos.lng}/?exclude=[minutely,hourly,daily,alerts,flags]`
  };

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

function getRadarUrl(z: number, x: number, y: number, cb: (res: any) => any): void {
  // pre-request, get most recent image
  let latest = Date.now();

  http.request('https://tilecache.rainviewer.com/api/maps.json', (msg: http.IncomingMessage) => {
    let times = '';
    msg.on('data', (chunk: string): void => {
      times += chunk;
    });
    msg.on('end', (): void => {
      console.log('Response has ended');

      let temp = times.split(",");
      latest = +temp[temp.length - 1].slice(0, -1);

      cb(`https://tilecache.rainviewer.com/v2/radar/${latest}/256/${z}/${x}/${y}/1/1_1.png`);
    });
    msg.on('error', (err): void => {
      console.log('Following error occured during request:\n');
      console.log(err);
    });
  }).end();
}