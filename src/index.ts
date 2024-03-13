#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';
import express from 'express';
import { runHeadlessBrowserAndExportSVG } from './renderer/renderer';
import { argv } from './arguments/arguments';
import { sendPing } from './ping/sendPing';
import semver from 'semver';
import cors from 'cors';
import { warnUserIfNotLatestVersion } from './utils/fetchLatestVersion';

const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10 MB

const execAsync = util.promisify(exec);

const PORT = (argv as any).rendererPort || 3000
const imagesPath = path.join(__dirname, '..', 'Icons');
const assetsPath = path.join(__dirname, '..', 'assets');
const inkdropLogoPath = path.join(__dirname, '..', 'build/logo.png');
const app = express();

if (process.env.INKDROP_DEMO === "true") {
    app.use(cors());
}

// Send a ping to the telemetry server, containing the used version of inkdrop
if (!(argv as any).telemetryOff) {
    sendPing()
}

if ((argv as any).debug) {
    warnUserIfNotLatestVersion()
}


if ((argv as any).planfile) {
    if (!fs.existsSync((argv as any).planfile) || !fs.lstatSync((argv as any).planfile).isFile()) {
        console.error(`The path to the plan file is invalid: ${(argv as any).planfile}`);
        process.exit(1);
    }
}
//Check if the argument "--path" contains a path to a Terraform project
if ((argv as any).path) {
    if (!fs.existsSync((argv as any).path) || !fs.lstatSync((argv as any).path).isDirectory()) {
        console.error(`The path to the Terraform project is invalid: ${(argv as any).path}`);
        process.exit(1);
    }
}

// Middleware to parse JSON bodies
app.use(express.json({ limit: '50mb' }));
app.use('/is-demo', (req, res) => {
    res.status(200).json({ value: process.env.INKDROP_DEMO === "true" });
})
app.use('/Icons', express.static(imagesPath));
app.use('/', express.static(assetsPath));
app.use('/logo.png', express.static(inkdropLogoPath));

// Serve static files from the build directory
app.use(express.static(path.resolve(__dirname, '..', 'build')));

let state: any = {}

const ci = (argv as any).ci || false

app.post('/senddata', async (req, res) => {
    const receivedData = req.body;
    Object.keys(receivedData).forEach(key => {
        state[key] = receivedData[key]
    })
    res.status(200).json({ message: 'Data stored', yourData: receivedData });
    if (ci) {
        console.log("Writing 'inkdrop-ci-data.json'...")
        fs.writeFileSync(path.resolve(((argv as any).path || "."), 'inkdrop-ci-data.json'), JSON.stringify(state))
    }
});

app.get('/getdata', (req, res) => {
    if (!state) {
        res.status(404).json({ message: 'No state found' });
        return
    }
    res.status(200).json({ message: 'Current state', state: state });
});

// Start the server
const server = app.listen(PORT, 'localhost', () => {
    console.log(`Diagram renderer running on localhost:${PORT}`);
});


async function runTerraformGraph(): Promise<void> {

    let planJson = ""

    if ((argv as any).planfile) {
        const { stdout: showStdout, stderr: showStderr } = await execAsync(`terraform show -json ${path.resolve((argv as any).planfile)}`, {
            cwd: path.resolve((argv as any).path || "."),
            maxBuffer: MAX_BUFFER_SIZE
        })
            .catch((err) => {
                console.error("Error while running 'terraform show -json':\n"
                    + err)
                process.exit(1);
            })
        if (showStderr) {
            console.error(`${showStderr}`);
            process.exit(1);
        }
        planJson = showStdout
    }

    const { stdout: versionStdout, stderr: versionStderr } = await execAsync('terraform -v -json', {
        cwd: path.resolve((argv as any).path || "."),
        maxBuffer: MAX_BUFFER_SIZE
    })
        .catch((err) => {
            console.error("Error while running 'terraform version':\n"
                + err)
            process.exit(1);
        })

    if (versionStderr) {
        console.error(`${versionStderr}`);
        process.exit(1);
    }

    const version = JSON.parse(versionStdout).terraform_version
    const addGraphPlanFlag = semver.gte(version, "1.7.0")

    const graphCommand = addGraphPlanFlag ? 'terraform graph -type=plan' : 'terraform graph'

    console.log("Computing raw graph...")
    const { stdout: graphStdout, stderr: graphStderr } = await execAsync(graphCommand, {
        cwd: path.resolve((argv as any).path || "."),
        maxBuffer: MAX_BUFFER_SIZE
    })
        .catch((err) => {
            console.error("Error while running 'terraform graph':\n"
                + err)
            process.exit(1);
        })

    if (graphStderr) {
        console.error(`${graphStderr}`);
        process.exit(1);
    }

    runHeadlessBrowserAndExportSVG(graphStdout, planJson, server, argv)
}

runTerraformGraph()