#!/usr/bin/env node

import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec); // This will allow us to await the command
const argv = yargs(hideBin(process.argv)).argv

import express from 'express';
import { runHeadlessBrowserAndExportSVG } from './renderer/renderer';

const PORT = (argv as any).rendererPort || 3000
const imagesPath = path.join(__dirname, 'Icons');
const assetsPath = path.join(__dirname, 'assets');
const app = express();

// Middleware to parse JSON bodies
app.use(express.json({ limit: '50mb' }));
app.use('/Icons', express.static(imagesPath));
app.use('/', express.static(assetsPath));

// Serve static files from the build directory
app.use(express.static(path.resolve(__dirname, 'build')));

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
const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`Diagram renderer running on localhost:${PORT}`);
});


async function runTerraformGraph(): Promise<void> {

    let planJson = ""

    if ((argv as any).fromPlan) {
        const { stdout: showStdout, stderr: showStderr } = await execAsync(`terraform show -json ${path.resolve((argv as any).fromPlan)}`, { cwd: path.resolve((argv as any).path || ".") });
        if (showStderr) {
            throw new Error(`Error running terraform show: ${showStderr}`);
        }
        planJson = showStdout
    }

    console.log("Computing raw graph...")
    const { stdout: graphStdout, stderr: graphStderr } = await execAsync('terraform graph', { cwd: path.resolve((argv as any).path || ".") });

    if (graphStderr) {
        throw new Error(`Error running computing graph: ${graphStderr}`);
    }

    runHeadlessBrowserAndExportSVG(graphStdout, planJson, server, argv)
}

runTerraformGraph()