#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';
import express from 'express';
import { runHeadlessBrowserAndExportSVG } from './renderer/renderer';
import { argv } from './arguments/arguments';
import { sendPing } from './ping/sendPing';

const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10 MB

const execAsync = util.promisify(exec);

const PORT = (argv as any).rendererPort || 3000
const imagesPath = path.join(__dirname, '..', 'Icons');
const assetsPath = path.join(__dirname, '..', 'assets');
const inkdropLogoPath = path.join(__dirname, '..', 'build/logo.png');
const app = express();

// Send a ping to the telemetry server, containing the used version of inkdrop
if (!(argv as any).telemetryOff) {
    sendPing()
}

// Check if the argument "--from-plan" contains a path to a plan file
if ((argv as any).fromPlan) {
    if (!fs.existsSync((argv as any).fromPlan) || !fs.lstatSync((argv as any).fromPlan).isFile()) {
        console.error(`The path to the plan file is invalid: ${(argv as any).fromPlan}`);
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
app.use('/Icons', express.static(imagesPath));
app.use('/', express.static(assetsPath));
app.use('/logo.png', express.static(inkdropLogoPath));

// Serve static files from the build directory
app.use(express.static(path.resolve(__dirname, '..', 'build')));

let state: any = {}

app.post('/senddata', (req, res) => {
    const receivedData = req.body;
    Object.keys(receivedData).forEach(key => {
        state[key] = receivedData[key]
    })
    res.status(200).json({ message: 'Data stored', yourData: receivedData });
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

    if ((argv as any).fromPlan) {
        const { stdout: showStdout, stderr: showStderr } = await execAsync(`terraform show -json ${path.resolve((argv as any).fromPlan)}`, {
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

    console.log("Computing raw graph...")
    const { stdout: graphStdout, stderr: graphStderr } = await execAsync('terraform graph', {
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