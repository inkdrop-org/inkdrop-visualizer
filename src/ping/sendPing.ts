import axios from "axios";
import { version } from '../../package.json';

const cloudFunctionUrl = "https://europe-west6-inkdrop-visualizer.cloudfunctions.net/ping"

// Send a ping to the telemetry server, containing the used version of inkdrop,
// and the options that were used

export const sendPing = (argv: any) => {
    axios.post(cloudFunctionUrl,
        {
            version: version,
            plan: argv.planfile ? true : false,
            ci: argv.ci || false,
            detailed: argv.detailed || false,
            debug: argv.debug || false,
            showUnchanged: argv.showUnchanged || false,
            opacityFull: argv.opacityFull || false,
            modules: argv.modules ? true : false,
            svg: argv.svg || false,
            disableSandbox: argv.disableSandbox || false,
            stateDirs: argv.stateDirs ? true : false,
        }).catch((e) => {
            //Do nothing. This will prevent the program from stopping
        })
}