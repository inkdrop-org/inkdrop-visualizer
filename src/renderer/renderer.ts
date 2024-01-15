import path from "path";
import puppeteer, { Page } from "puppeteer";
import { sleep } from "../utils/time";
import { Server } from "http";
import fs from "fs";

import { exec } from "child_process";

function openUrl(url: string) {
    let startCommand;

    switch (process.platform) {
        case 'darwin': // macOS
            startCommand = 'open';
            break;
        case 'win32': // Windows
            startCommand = 'start';
            break;
        case 'linux': // Linux
            startCommand = 'xdg-open';
            break;
        default:
            throw new Error(`Unsupported platform: ${process.platform}`);
    }

    exec(`${startCommand} ${url}`, (err) => {
        if (err) {
            console.error(`Failed to open ${url}: ${err.message}`);
            return;
        }
    });
}

async function performActionsToDownloadFile(page: Page) {
    page.waitForSelector('.tlui-layout').then(async () => {
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
    });
}

// Main Puppeteer logic for extracting SVG
export async function runHeadlessBrowserAndExportSVG(graphVizText: string, planOutput: string, server: Server, argv: any) {

    console.log("Processing raw graph...")
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    const PORT = (argv as any).rendererPort || 3000
    // check if the argument "--no-ui" is passed
    const noUi = (argv as any).noUi || false
    // check if the argument "--detailed" is passed
    const detailed = (argv as any).detailed || false

    await page.goto(`http://127.0.0.1:${PORT}/index.html`);

    const client = await page.target().createCDPSession();

    let suggestedFilename = ""

    const downloadFolder = path.resolve((argv as any).out || (argv as any).path || ".")
    const downloadPath = path.resolve((argv as any).out || (argv as any).path || ".")

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
            if (noUi) {
                server.close();
            } else {
                console.log("Opening Inkdrop...")
                openUrl(`http://127.0.0.1:${PORT}/`);
            }
        }
    });

    page.waitForSelector('.tlui-layout').then(async () => {
        await page.evaluate((graphData, planData, detailed) => {
            const graphTextArea = document.getElementById('inkdrop-graphviz-textarea');
            if (graphTextArea && graphTextArea instanceof HTMLTextAreaElement) {
                graphTextArea.value = graphData;
            }
            const planTextArea = document.getElementById('inkdrop-plan-textarea');
            if (planTextArea && planTextArea instanceof HTMLTextAreaElement) {
                planTextArea.value = planData;
            }
            const detailedTextArea = document.getElementById('detailed-textarea');
            if (detailedTextArea && detailedTextArea instanceof HTMLTextAreaElement) {
                detailedTextArea.value = detailed
            }
            const button = document.getElementById('render-button');
            if (button) {
                button.click()
            }
        }, graphVizText, planOutput, detailed); // Pass graphVizText as an argument here
        await sleep(3000);
        await performActionsToDownloadFile(page)
    }).catch(async () => {
        console.log("Error rendering graph")
        server.close()
        await browser.close()
    });
}