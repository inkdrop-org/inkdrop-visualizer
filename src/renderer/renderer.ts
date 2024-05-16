import path from "path";
import puppeteer, { ElementHandle, Page } from "puppeteer";
import { install, getInstalledBrowsers, Browser } from "@puppeteer/browsers"
import { Server } from "http";
import fs from "fs";
import ProgressBar from "progress"
import { openUrl } from "..";
import { argv } from "../arguments/arguments";
import { getCurrentFormattedDate } from "../utils/time";

const chromeRevision = "123.0.6312.58"

const modules = (argv as any).modules || []
let imgsCount = modules.length + 1

async function performActionsToDownloadFile(page: Page) {
    page.waitForSelector('.tlui-layout').then(async () => {
        await page.mouse.click(400, 0, { button: 'right' });
        const selectAllButton = await page.$('[data-testid="menu-item.select-all"]');
        if (selectAllButton) {
            await selectAllButton.click();
        } else {
            console.warn("Empty diagram detected. No SVG will be created.")
            process.exit(1)
        }
        await page.mouse.click(400, 0, { button: 'right' });
        const exportAsButton = await page.$('[data-testid="menu-item.export-as"]');
        if (exportAsButton) {
            await exportAsButton.click();
        }
        const svgButton = await page.$('[data-testid="menu-item.export-as-svg"]');
        if (svgButton) {
            await svgButton.click();
        }

        //enlarge the window to make sure the whole diagram is visible
        await page.setViewport({ width: 4000, height: 1080 });

        for (const module of modules) {
            const moduleFrame = await (await page.$('.tl-frame-label > [value="module.' + module + '"]'))!.getProperty("parentNode");
            if (moduleFrame) {
                await (moduleFrame as ElementHandle).click({ button: 'right' })
                const exportAsButton = await page.$('[data-testid="menu-item.export-as"]');
                if (exportAsButton) {
                    await exportAsButton.click();
                }
                const svgButton = await page.$('[data-testid="menu-item.export-as-svg"]');
                if (svgButton) {
                    await svgButton.click();
                }
            }
        }

    });
}

let bar: ProgressBar
// Main Puppeteer logic for extracting SVG
export async function runHeadlessBrowserAndExportSVG(server: Server, argv: any) {

    console.log("Creating SVG of the diagram...")
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
    const noSandbox = (argv as any).disableSandbox || false;
    const launchArgs = [];
    if (noSandbox) {
        launchArgs.push("--no-sandbox");
    }

    const browser = await puppeteer.launch({ headless: true, args: launchArgs });
    const page = await browser.newPage();
    const ci = (argv as any).ci || false
    const PORT = (argv as any).rendererPort || 3000

    await page.goto(`http://localhost:${PORT}/index.html`);

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
            const newName = suggestedFilename.startsWith("shapes at ") ?
                suggestedFilename.replace("shapes at ", "inkdrop-diagram_").replace(" ", "_") :
                suggestedFilename.replace(/(.*)\.svg/g, "$1_" + getCurrentFormattedDate() + ".svg");
            fs.renameSync(path.resolve(downloadFolder, suggestedFilename),
                path.resolve(downloadFolder, newName));
            console.log(`Downloaded diagram -> ${path.resolve(downloadFolder, newName)}`)
            if (imgsCount > 1) {
                imgsCount--
            } else {
                await browser.close();
                if (ci) {
                    server.close();
                } else {
                    console.log("Opening Inkdrop...")
                    openUrl(`http://localhost:${PORT}/`);
                }
            }
        }
    });

    page.waitForSelector('.tlui-layout').then(async () => {
        await performActionsToDownloadFile(page)
    }).catch(async () => {
        console.error("Error rendering graph")
        server.close()
        await browser.close()
    });
}