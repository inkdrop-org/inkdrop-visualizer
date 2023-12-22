#!/usr/bin/env node

import path from 'path';
import puppeteer, { Page } from 'puppeteer';
import fs from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec); // This will allow us to await the command
const argv = yargs(hideBin(process.argv)).argv

import express from 'express';

const PORT = (argv as any).rendererPort || 3000 // You may choose any available port
const imagesPath = path.join(__dirname, 'Icons');
const app = express();
app.use('/Icons', express.static(imagesPath));

// Serve static files from the build directory
app.use(express.static(path.resolve(__dirname, 'build')));

// Start the server
const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`Diagram renderer running on http://127.0.0.1:${PORT}`);
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

    runHeadlessBrowserAndExportSVG(graphStdout, planJson)
}

async function performActionsToDownloadFile(page: Page) {
    // Define the platform-specific key for 'Control' or 'Command'

    await page.mouse.click(0, 0, { button: 'right' }); // Update x, y coordinates as needed
    const selectAllButton = await page.$('[data-testid="menu-item.select-all"]');
    if (selectAllButton) {
        await selectAllButton.click();
    }
    await page.mouse.click(0, 0, { button: 'right' }); // Update x, y coordinates as needed
    const exportAsButton = await page.$('[data-testid="menu-item.export-as"]');
    if (exportAsButton) {
        await exportAsButton.click();
    }
    const svgButton = await page.$('[data-testid="menu-item.export-as-svg"]');
    if (svgButton) {
        await svgButton.click();
    }
}

// Main Puppeteer logic for extracting SVG
async function runHeadlessBrowserAndExportSVG(graphVizText: string, planOutput: string) {
    console.log("Processing raw graph...")
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/index.html`);    // The path to your HTML file that is designed to load the React bundle.


    // Now add your script tag pointing to the local bundle file with the correct path.
    await page.addScriptTag({ path: path.resolve(__dirname, 'build/bundle.js') });


    const client = await page.target().createCDPSession();

    // Act like a dictionary storing the filename for each file with guid
    let suggestedFilename = ""

    const downloadFolder = path.resolve((argv as any).out || (argv as any).path || ".")
    const downloadPath = path.resolve((argv as any).out || (argv as any).path || ".") // Set the download path to your current working directory.

    await client.send('Browser.setDownloadBehavior', {
        behavior: 'allow',
        eventsEnabled: true,
        downloadPath: downloadPath,
    })

    client.on('Browser.downloadWillBegin', async (event) => {
        //some logic here to determine the filename
        //the event provides event.suggestedFilename and event.url
        suggestedFilename = event.suggestedFilename;
    });

    client.on('Browser.downloadProgress', async (event) => {
        // when the file has been downloaded, locate the file by guid and rename it

        if (event.state === 'completed') {
            fs.renameSync(path.resolve(downloadFolder, suggestedFilename), path.resolve(downloadFolder, suggestedFilename.replace("shapes", "inkdrop-diagram")));
            console.log(`Downloaded diagram -> ${path.resolve(downloadFolder, suggestedFilename.replace("shapes", "inkdrop-diagram"))}`)
            await browser.close();
            server.close()
        }
    });

    await page.evaluate((graphData, planData) => {
        const graphTextArea = document.getElementById('inkdrop-graphviz-textarea');
        if (graphTextArea && graphTextArea instanceof HTMLTextAreaElement) {
            graphTextArea.value = graphData;
        }
        const planTextArea = document.getElementById('inkdrop-plan-textarea');
        if (planTextArea && planTextArea instanceof HTMLTextAreaElement) {
            planTextArea.value = planData;
        }
        setTimeout(() => {
            const button = document.getElementById('render-button');
            if (button) {
                button.click();
            }
        }, 2000);
    }, graphVizText, planOutput); // Pass graphVizText as an argument here
    setTimeout(async () => {
        await performActionsToDownloadFile(page)
    }, 3000);
}

runTerraformGraph()