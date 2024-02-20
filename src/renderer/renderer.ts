import path from "path";
import puppeteer, { Page } from "puppeteer";
import { install, getInstalledBrowsers, Browser } from "@puppeteer/browsers"
import { sleep } from "../utils/time";
import { Server } from "http";
import fs from "fs";
import ProgressBar from "progress"

import { exec } from "child_process";

const chromeRevision = "119.0.6045.105"

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
        await page.mouse.click(0, 0, { button: 'right' });
        const selectAllButton = await page.$('[data-testid="menu-item.select-all"]');
        if (selectAllButton) {
            await selectAllButton.click();
        } else {
            console.error("No AWS Terraform resources found in graph.")
            console.error("Please ensure that you have run Inkdrop inside your Terraform project directory, or specify the path to your Terraform project using the --path argument.")
            process.exit(1)
        }
        await page.mouse.click(0, 0, { button: 'right' });
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

let bar: ProgressBar
// Main Puppeteer logic for extracting SVG
export async function runHeadlessBrowserAndExportSVG(graphVizText: string, planOutput: string, server: Server, argv: any) {

    console.log("Processing raw graph...")
    const installDir = path.resolve(path.join(process.env.HOME || "", '.cache', 'puppeteer'))
    const installedBrowsers = await getInstalledBrowsers({ cacheDir: installDir })
    if (installedBrowsers.length === 0 || !installedBrowsers.some(b => b.browser === Browser.CHROME && b.buildId === chromeRevision)) {
        console.log("Chromium not found in cache, downloading...")
        await install({
            browser: Browser.CHROME,
            cacheDir: installDir,
            buildId: chromeRevision,
            downloadProgressCallback: (downloadedBytes, totalBytes) => {
                if (!bar) {
                    bar = new ProgressBar('Downloading Chromium [:bar] :percent :etas', {
                        complete: '=',
                        incomplete: ' ',
                        width: 40,
                        total: totalBytes,
                    });
                }

                // Update the progress bar
                bar.tick(downloadedBytes - bar.curr);
            }
        })
    }
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    const ci = (argv as any).ci || false
    const debug = (argv as any).debug || false
    const PORT = (argv as any).rendererPort || 3000
    const noUi = (argv as any).disableUi || false
    const detailed = (argv as any).detailed || false
    const showInactive = (argv as any).showInactive || false
    const context = ci ? "ci" : "interactive"

    await page.goto(`http://localhost:${PORT}/index.html`);

    page
        .on('console', (message) => {
            // TODO: This is a workaround, as I can't figure out how to suppress this error message. To be fixed.
            if (!message.text().startsWith("Error: <path> attribute d: Expected number")) {
                console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`)
            }
        })
        .on('pageerror', ({ message }) => console.log(message))

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
        suggestedFilename = event.suggestedFilename;
    });

    client.on('Browser.downloadProgress', async (event) => {

        if (event.state === 'completed') {
            fs.renameSync(path.resolve(downloadFolder, suggestedFilename), path.resolve(downloadFolder, suggestedFilename.replace("shapes", "inkdrop-diagram")));
            console.log(`Downloaded diagram -> ${path.resolve(downloadFolder, suggestedFilename.replace("shapes", "inkdrop-diagram"))}`)
            await browser.close();
            if (noUi || ci) {
                server.close();
            } else {
                console.log("Opening Inkdrop...")
                openUrl(`http://localhost:${PORT}/`);
            }
        }
    });

    page.waitForSelector('.tlui-layout').then(async () => {
        await page.evaluate((graphData, planData, detailed, showInactive, debug) => {
            const graphTextArea = document.getElementById('inkdrop-graphviz-textarea');
            if (graphTextArea && graphTextArea instanceof HTMLTextAreaElement) {
                graphTextArea.value = graphData
            }
            const planTextArea = document.getElementById('inkdrop-plan-textarea');
            if (planTextArea && planTextArea instanceof HTMLTextAreaElement) {
                planTextArea.value = planData
            }
            const detailedTextArea = document.getElementById('detailed-textarea');
            if (detailedTextArea && detailedTextArea instanceof HTMLTextAreaElement) {
                detailedTextArea.value = detailed
            }
            const showInactiveTextArea = document.getElementById('show-inactive-textarea');
            if (showInactiveTextArea && showInactiveTextArea instanceof HTMLTextAreaElement) {
                showInactiveTextArea.value = showInactive
            }
            const debugTextArea = document.getElementById('debug-textarea');
            if (debugTextArea && debugTextArea instanceof HTMLTextAreaElement) {
                debugTextArea.value = debug
            }
            const button = document.getElementById('render-button');
            if (button) {
                button.click()
            }
        }, graphVizText, planOutput, detailed, showInactive, debug);
        await performActionsToDownloadFile(page)
    }).catch(async () => {
        console.error("Error rendering graph")
        server.close()
        await browser.close()
    });
}