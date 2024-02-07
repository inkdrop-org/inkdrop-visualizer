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

// Main Puppeteer logic for extracting SVG
export async function runHeadlessBrowserAndExportSVG(graphVizText: string, planOutput: string, server: Server, argv: any) {

    console.log("Processing raw graph...")
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    const debug = (argv as any).debug || false
    const PORT = (argv as any).rendererPort || 3000
    const noUi = (argv as any).disableUi || false
    const detailed = (argv as any).detailed || false
    const showInactive = (argv as any).showInactive || false

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
            if (noUi) {
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