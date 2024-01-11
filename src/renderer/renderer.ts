import { Server } from "http";
import path from "path";
import puppeteer, { Page } from "puppeteer";
import { sleep } from "../utils/time";
import fs from "fs";

async function performActionsToDownloadFile(page: Page) {
    // Define the platform-specific key for 'Control' or 'Command'
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
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const PORT = (argv as any).rendererPort || 3000
    await page.goto(`http://127.0.0.1:${PORT}/index.html`);    // The path to your HTML file that is designed to load the React bundle.


    // Now add your script tag pointing to the local bundle file with the correct path.
    await page.addScriptTag({ path: path.resolve(__dirname, '../build/bundle.js') });


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

    page.waitForSelector('.tlui-layout').then(async () => {
        await page.evaluate((graphData, planData) => {
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
        }, graphVizText, planOutput); // Pass graphVizText as an argument here
        await sleep(3000);
        await performActionsToDownloadFile(page)
    }).catch(async () => {
        console.log("Error rendering graph")
        server.close()
        await browser.close()
    });
}