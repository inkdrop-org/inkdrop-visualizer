import path from "path";
import fs from "fs";
import { chromium, Page } from "playwright";
import { sleep } from "../utils/time";
import { Server } from "http";

async function rightClickTopLeftCorner(page: Page, selector: string) {
    const element = await page.waitForSelector(selector);
    const boundingBox = await element.boundingBox();

    if (boundingBox) {
        // Perform a right-click at the top-left corner of the bounding box
        // Note: boundingBox.x and boundingBox.y are the coordinates of the top-left corner
        await page.mouse.click(boundingBox.x, 0, { button: 'right' });
    } else {
        throw new Error(`Could not find bounding box for selector ${selector}`);
    }
}

async function performActionsToDownloadFile(page: Page) {
    // Define the platform-specific key for 'Control' or 'Command'

    await page.waitForSelector('.tlui-layout');
    await rightClickTopLeftCorner(page, '.tlui-layout');

    const selectAllButton = await page.$('[data-testid="menu-item.select-all"]');
    if (selectAllButton) {
        await selectAllButton.click();
    }
    await rightClickTopLeftCorner(page, '.tlui-layout');

    const exportAsButton = await page.$('[data-testid="menu-item.export-as"]');
    if (exportAsButton) {
        await exportAsButton.click();
    }
    const svgButton = await page.$('[data-testid="menu-item.export-as-svg"]');
    if (svgButton) {
        await svgButton.click();
    }
}

export async function runHeadlessBrowserAndExportSVG(graphVizText: string, planOutput: string, server: Server, argv: any) {
    console.log("Processing raw graph...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        acceptDownloads: true // This option allows downloads in headless mode
    });
    const page = await context.newPage();
    const PORT = argv.rendererPort || 3000;
    await page.goto(`http://127.0.0.1:${PORT}/index.html`);

    await page.addScriptTag({ path: path.resolve(__dirname, '../build/bundle.js') });

    const downloadFolder = path.resolve(argv.out || argv.path || ".");

    page.on('download', async (download) => {
        // Wait for the download and save to the file.
        const outputPath = download.suggestedFilename().replace("shapes", "inkdrop-diagram");
        const downloadPath = path.join(downloadFolder, outputPath);
        await download.saveAs(downloadPath);
        console.log(`Downloaded diagram -> ${downloadPath}`);
        await browser.close();
        server.close();
    });

    try {
        await page.waitForSelector('.tlui-layout');

        await page.evaluate(({ graphData, planData }) => {
            // Assuming `graphData` and `planData` are expected to be available here as variables.
            const graphTextArea = document.getElementById('inkdrop-graphviz-textarea');
            if (graphTextArea && graphTextArea instanceof HTMLTextAreaElement) {
                graphTextArea.value = graphData;
            }
            const planTextArea = document.getElementById('inkdrop-plan-textarea');
            if (planTextArea && planTextArea instanceof HTMLTextAreaElement) {
                planTextArea.value = planData;
            }
            const button = document.getElementById('render-button');
            if (button) {
                button.click();
            }
        }, { graphData: graphVizText, planData: planOutput }); // Passing an object containing both variables

        await sleep(3000); // Consider using waitForFunction or waitForTimeout instead
        await performActionsToDownloadFile(page);

        // Wait for the download event or the browser disconnection, implemented according to your needs.

    } catch (error) {
        console.log("Error rendering graph:", error);
        server.close();
        await browser.close();
    }
}