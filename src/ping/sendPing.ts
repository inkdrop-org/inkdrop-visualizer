import axios from "axios";
import { version } from '../../package.json';

const cloudFunctionUrl = "https://europe-west6-inkdrop-visualizer.cloudfunctions.net/ping"

const pingData = {
    version: version,
};


export const sendPing = () => {
    axios.post(cloudFunctionUrl, pingData).catch((e) => {
        //Do nothing. This will not stop the execution
    })
}