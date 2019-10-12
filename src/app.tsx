import { h, Component } from "preact";
import * as http from 'http';

export interface AppProps {
  name: string;
  latitude: number;
  longitude: number;
  darkskyresponse: object;
}

interface AppState {
  name: string;
}

export class App extends Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);

    this.state = { name: props.name };
  }

  render(props: AppProps, state: AppState) {
    return <h1>props: {props.name} state: {state.name}</h1>;
  }

  private weatherbylocation(cb: (res: any) => any): void {
    let opts = {
      'host': 'https://api.darksky.net/forecast/',
      'path': `b0e63aba7967a12f9f90caba7e7b088f/${latitude},${longitude}/?exclude=[minutely,hourly,daily,alerts,flags]`
    };
    http.request(opts, (r: http.IncomingMessage): void => {
      let data = '';
      r.on('data', (chunk: string): void => {
        console.log('Got chunk: ' + chunk);
        data += chunk;
      });
      r.on('end', (): void =>{
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
}