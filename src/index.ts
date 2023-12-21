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


async function runTerraformGraph(): Promise<void> {

    console.log("Running terraform init...")
    const { stdout: initStdout, stderr: initStderr } = await execAsync('terraform init', { cwd: path.resolve((argv as any).path || ".") })
    if (initStderr) {
        throw new Error(`Error running terraform init: ${initStderr}`);
    }
    if (initStdout) {
        console.log(initStdout)
    }
    console.log("Computing raw graph...")
    const { stdout, stderr } = await execAsync('terraform graph', { cwd: path.resolve((argv as any).path || ".") });

    if (stderr) {
        throw new Error(`Error running computing graph: ${stderr}`);
    }

    runHeadlessBrowserAndExportSVG(stdout)
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
async function runHeadlessBrowserAndExportSVG(graphVizText: string) {
    console.log("Processing raw graph...")
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto('https://inkdrop.ai');
    // The path to your HTML file that is designed to load the React bundle.
    const reactHtmlFile = path.resolve(__dirname, 'build/index.html');

    // Use page.setContent to load your local HTML that includes the mounting point for your React app.
    // Alternatively, serve this file using a local server and use page.goto with the server URL.
    const htmlContent = fs.readFileSync(reactHtmlFile, 'utf8');
    await page.setContent(htmlContent);

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
        }
    });

    await page.evaluate((graphData) => {
        const textarea = document.getElementById('inkdrop-graphviz-textarea');
        if (textarea && textarea instanceof HTMLTextAreaElement) {
            textarea.value = graphData; // Use value instead of innerHTML for textarea
        }
        setTimeout(() => {
            const button = document.getElementById('render-button');
            if (button) {
                button.click();
            }
        }, 2000);
    }, graphVizText); // Pass graphVizText as an argument here
    setTimeout(async () => {
        await performActionsToDownloadFile(page)
    }, 3000);
}

runTerraformGraph()