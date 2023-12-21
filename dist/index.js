#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const fs_1 = __importDefault(require("fs"));
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const execAsync = util_1.default.promisify(child_process_1.exec); // This will allow us to await the command
const argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv)).argv;
function runTerraformGraph() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Running terraform init...");
        const { stdout: initStdout, stderr: initStderr } = yield execAsync('terraform init', { cwd: argv.path || "." });
        if (initStderr) {
            throw new Error(`Error running terraform init: ${initStderr}`);
        }
        if (initStdout) {
            console.log(initStdout);
        }
        console.log("Computing raw graph...");
        const { stdout, stderr } = yield execAsync('terraform graph', { cwd: argv.path || "." });
        if (stderr) {
            throw new Error(`Error running computing graph: ${stderr}`);
        }
        runHeadlessBrowserAndExportSVG(stdout);
    });
}
function performActionsToDownloadFile(page) {
    return __awaiter(this, void 0, void 0, function* () {
        // Define the platform-specific key for 'Control' or 'Command'
        yield page.mouse.click(0, 0, { button: 'right' }); // Update x, y coordinates as needed
        const selectAllButton = yield page.$('[data-testid="menu-item.select-all"]');
        if (selectAllButton) {
            yield selectAllButton.click();
        }
        yield page.mouse.click(0, 0, { button: 'right' }); // Update x, y coordinates as needed
        const exportAsButton = yield page.$('[data-testid="menu-item.export-as"]');
        if (exportAsButton) {
            yield exportAsButton.click();
        }
        const svgButton = yield page.$('[data-testid="menu-item.export-as-svg"]');
        if (svgButton) {
            yield svgButton.click();
        }
    });
}
// Main Puppeteer logic for extracting SVG
function runHeadlessBrowserAndExportSVG(graphVizText) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Processing raw graph...");
        const browser = yield puppeteer_1.default.launch({ headless: "new" });
        const page = yield browser.newPage();
        yield page.goto('https://inkdrop.ai');
        // The path to your HTML file that is designed to load the React bundle.
        const reactHtmlFile = path_1.default.resolve(__dirname, 'build/index.html');
        // Use page.setContent to load your local HTML that includes the mounting point for your React app.
        // Alternatively, serve this file using a local server and use page.goto with the server URL.
        const htmlContent = fs_1.default.readFileSync(reactHtmlFile, 'utf8');
        yield page.setContent(htmlContent);
        // Now add your script tag pointing to the local bundle file with the correct path.
        yield page.addScriptTag({ path: path_1.default.resolve(__dirname, 'build/bundle.js') });
        const client = yield page.target().createCDPSession();
        // Act like a dictionary storing the filename for each file with guid
        let suggestedFilename = "";
        const downloadFolder = argv.out || argv.path || ".";
        yield client.send('Browser.setDownloadBehavior', {
            behavior: 'allow',
            eventsEnabled: true,
            downloadPath: argv.out || argv.path || ".", // Set the download path to your current working directory.
        });
        client.on('Browser.downloadWillBegin', (event) => __awaiter(this, void 0, void 0, function* () {
            //some logic here to determine the filename
            //the event provides event.suggestedFilename and event.url
            suggestedFilename = event.suggestedFilename;
        }));
        client.on('Browser.downloadProgress', (event) => __awaiter(this, void 0, void 0, function* () {
            // when the file has been downloaded, locate the file by guid and rename it
            if (event.state === 'completed') {
                fs_1.default.renameSync(path_1.default.resolve(downloadFolder, suggestedFilename), path_1.default.resolve(downloadFolder, suggestedFilename.replace("shapes", "inkdrop-diagram")));
                console.log(`Downloaded diagram -> ${path_1.default.resolve(downloadFolder, suggestedFilename.replace("shapes", "inkdrop-diagram"))}`);
                yield browser.close();
            }
        }));
        yield page.evaluate((graphData) => {
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
        setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            yield performActionsToDownloadFile(page);
        }), 3000);
    });
}
runTerraformGraph();
