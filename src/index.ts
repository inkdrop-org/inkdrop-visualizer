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
const app = express();
app.use('/Icons', express.static(imagesPath));

// Serve static files from the build directory
app.use(express.static(path.resolve(__dirname, 'build')));

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