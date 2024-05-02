#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';
import express from 'express';
import { runHeadlessBrowserAndExportSVG } from './renderer/renderer';
import { argv } from './arguments/arguments';
import { sendPing } from './ping/sendPing';
import semver from 'semver';
import cors from 'cors';
import { warnUserIfNotLatestVersion } from './utils/fetchLatestVersion';
import { getCurrentFormattedDate } from './utils/time';

const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10 MB

const execAsync = util.promisify(exec);

const PORT = (argv as any).rendererPort || 3000
const imagesPath = path.join(__dirname, '..', 'Icons');
const assetsPath = path.join(__dirname, '..', 'assets');
const inkdropLogoPath = path.join(__dirname, '..', 'build/logo.png');
const app = express();

if (process.env.INKDROP_DEMO === "true") {
    app.use(cors());
}

// Send a ping to the telemetry server, containing the used version of inkdrop
if (!(argv as any).telemetryOff) {
    sendPing()
}

if ((argv as any).debug) {
    warnUserIfNotLatestVersion()
}

if ((argv as any).planfile) {
    if (!fs.existsSync((argv as any).planfile) || !fs.lstatSync((argv as any).planfile).isFile()) {
        console.error(`The path to the plan file is invalid: ${(argv as any).planfile}`);
        process.exit(1);
    }
}

//Check if the argument "--path" contains a path to a Terraform project
if ((argv as any).path) {
    if (!fs.existsSync((argv as any).path) || !fs.lstatSync((argv as any).path).isDirectory()) {
        console.error(`The path to the Terraform project is invalid: ${(argv as any).path}`);
        process.exit(1);
    }
}

// Middleware to parse JSON bodies
app.use(express.json({ limit: '50mb' }));
app.use('/is-demo', (req, res) => {
    res.status(200).json({ value: process.env.INKDROP_DEMO === "true" });
})
app.use('/Icons', express.static(imagesPath));
app.use('/', express.static(assetsPath));
app.use('/logo.png', express.static(inkdropLogoPath));

// Serve static files from the build directory
app.use(express.static(path.resolve(__dirname, '..', 'build')));

let state: any = {}

const ci = (argv as any).ci || false
const modules = (argv as any).modules || []

app.post('/send-ci-data', async (req, res) => {
    const receivedData = req.body;
    Object.keys(receivedData).forEach(key => {
        state[key] = receivedData[key]
    })
    res.status(200).json({ message: 'Data stored', yourData: receivedData });
    if (ci) {
        const currentDate = getCurrentFormattedDate()
        console.log("Writing 'inkdrop-ci-data_" + currentDate + ".json'...")
        fs.writeFileSync(path.resolve(((argv as any).path || "."), 'inkdrop-ci-data_' + currentDate + '.json'), JSON.stringify(state))
        modules.forEach((module: string) => {
            console.log(`Writing 'inkdrop-ci-data-${module}_${currentDate}.json'...`)
            fs.writeFileSync(path.resolve(((argv as any).path || "."), `inkdrop-ci-data-${module}_${currentDate}.json`), JSON.stringify({
                ...state,
                planJson: {
                    ...state.planJson,
                    resource_changes: state.planJson.resource_changes.filter((change: any) => {
                        return change.address.startsWith(`module.${module}`)
                    })
                }
            }))
        })
    }
});

app.post('/debug-log', (req, res) => {
    console.log(req.body.log);
    res.status(200).json({ message: 'Log received' });
})

const findResource = async (resourceId: string) => {
    const cwdPath = path.resolve(".");

    const { stdout: files } = await execAsync('find . -type f -name "*.tf"', { cwd: cwdPath });
    const filesArr = files.trim().split("\n");

    const matches = resourceId.match(/^module\.([^\.]+)\.([^\.]+)\.([^[]+)(\[\d+\])?$/);
    if (!matches) {
        console.error("Invalid resource ID format.");
        return;
    }

    const [, moduleName, resourceType, resourceName] = matches;

    for (const file of filesArr) {
        const fileContent = await readFileContents(file, cwdPath);
        if (fileContent.includes(`module "${moduleName}"`)) {
            const sourceMatch = fileContent.match(new RegExp(`module "${moduleName}"\\s*\\{[^\\}]*source\\s*=\\s*"([^"]+)"`, 's'));
            if (sourceMatch && sourceMatch[1]) {
                const moduleSourcePath = path.resolve(cwdPath, sourceMatch[1]);
                return await findResourceInModule(moduleSourcePath, resourceName, resourceType);
            }
        }
    }
    return null;
};

const findResourceInModule = async (modulePath: string, resourceName: string, resourceType: string) => {
    const { stdout: moduleFiles } = await execAsync(`find ${modulePath} -type f -name "*.tf"`);
    const moduleFilesArr = moduleFiles.trim().split("\n");

    for (const tfFile of moduleFilesArr) {
        const content = await readFileContents(tfFile, modulePath);
        const found = extractResourceBlock(content, resourceName, resourceType);
        if (found) {
            return found;
        }
    }
    return null;
};

const extractResourceBlock = (content: string, resourceName: string, resourceType: string): string | null => {
    const pattern = new RegExp(`resource\\s+"${resourceType}"\\s+"${resourceName}"\\s*\\{`, 'g');
    let match;
    while ((match = pattern.exec(content))) {
        const startIndex = match.index + match[0].length;
        let openBraces = 1;
        let index = startIndex;

        while (openBraces > 0 && index < content.length) {
            if (content[index] === '{') openBraces++;
            else if (content[index] === '}') openBraces--;
            index++;
        }

        if (openBraces === 0) {
            // Successfully found a resource block with balanced braces
            return content.substring(match.index, index);
        }
    }
    return null;
};

const readFileContents = async (filePath: string, basePath: string) => {
    const { stdout: content } = await execAsync(`cat ${path.resolve(basePath, filePath)}`);
    return content;
};

app.post('/resource-code', async (req, res) => {
    const resourceIds = req.body.resourceIds;
    const resourceCodes = await Promise.all(resourceIds.map(async (resourceId: string) => {
        return findResource(resourceId);
    }));
    res.status(200).json({ value: resourceCodes });
});


let planJson = ""
let graph = ""

const debug: boolean = (argv as any).debug || false
const detailed: boolean = (argv as any).detailed || false
const showUnchanged: boolean = (argv as any).showUnchanged || false
const opacityFull: boolean = (argv as any).opacityFull || false

const states: any[] = []

app.get('/get-render-input', (req, res) => {
    res.status(200).json({
        planJson,
        graph,
        detailed,
        debug,
        showUnchanged,
        ci,
        opacityFull,
        states: states
    });
})

// Start the server
const server = app.listen(PORT, 'localhost', () => {
    console.log(`Diagram renderer running on localhost:${PORT}`);
});

export const openUrl = (url: string) => {
    if (process.env.INKDROP_DEMO === "true") return;

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

const cleanup = async () => {
    await execAsync("rm -rf ./tmp-tf-cache-inkdrop")
}

const printErrorAndCleanup = async (err: string) => {
    console.error(err)
    await cleanup()
    process.exit(1)
}

const retrieveRemoteState = async (projectPath: string, graphCommand: string) => {
    console.log(`Retrieving remote state for ${projectPath}...`)
    const { stdout: terraformDirPresent } = await execAsync(`if [ ! -d .terraform ]; then echo false; else echo true; fi`, {
        cwd: path.resolve(projectPath),
    })
    if (terraformDirPresent.trim() === "false") {
        const { stderr: stateStderr } = await execAsync(`export TF_PLUGIN_CACHE_DIR=${path.resolve("./tmp-tf-cache-inkdrop")} && terraform init`, {
            cwd: path.resolve(projectPath),
            maxBuffer: MAX_BUFFER_SIZE
        })
        if (stateStderr) {
            printErrorAndCleanup(stateStderr)
        }
    }
    const { stdout: statePullStdout, stderr: statePullStderr } = await execAsync(`terraform state pull`, {
        cwd: path.resolve(projectPath),
        maxBuffer: MAX_BUFFER_SIZE
    })
    if (statePullStderr) {
        printErrorAndCleanup(statePullStderr)
    }
    const { stdout: graphStdout, stderr: graphStderr } = await execAsync(graphCommand, {
        cwd: path.resolve(projectPath),
        maxBuffer: MAX_BUFFER_SIZE
    })
    if (graphStderr) {
        printErrorAndCleanup(graphStderr)
    }
    states.push({
        name: projectPath.split("/").pop(),
        state: statePullStdout,
        graph: graphStdout
    })
    if (terraformDirPresent.trim() === "false") {
        await execAsync(`rm -rf .terraform`, {
            cwd: path.resolve(projectPath)
        })
    }
}

const runTerraformCommands = async () => {
    if ((argv as any).planfile) {
        const { stdout: showStdout, stderr: showStderr } = await execAsync(`terraform show -json "${path.resolve((argv as any).planfile)}"`, {
            cwd: path.resolve((argv as any).path || "."),
            maxBuffer: MAX_BUFFER_SIZE
        }).catch((err) => {
            console.error("Error while running 'terraform show -json':\n"
                + err)
            process.exit(1);
        })
        if (showStderr) {
            console.error(`${showStderr}`);
            process.exit(1);
        }
        planJson = showStdout
    }

    const { stdout: versionStdout, stderr: versionStderr } = await execAsync('terraform -v -json', {
        cwd: path.resolve((argv as any).path || "."),
        maxBuffer: MAX_BUFFER_SIZE
    })
        .catch((err) => {
            console.error("Error while running 'terraform version':\n"
                + err)
            process.exit(1);
        })

    if (versionStderr) {
        console.error(`${versionStderr}`);
        process.exit(1);
    }

    const version = JSON.parse(versionStdout).terraform_version
    const addGraphPlanFlag = semver.gte(version, "1.7.0")

    const graphCommand = addGraphPlanFlag ? 'terraform graph -type=plan' : 'terraform graph'

    console.log("Computing terraform graph...")
    const { stdout: graphStdout, stderr: graphStderr } = await execAsync(graphCommand, {
        cwd: path.resolve((argv as any).path || "."),
        maxBuffer: MAX_BUFFER_SIZE
    })
        .catch((err) => {
            console.error("Error while running 'terraform graph':\n"
                + err)
            process.exit(1);
        })

    if (graphStderr) {
        console.error(`${graphStderr}`);
        process.exit(1);
    }

    graph = graphStdout

    const stateDirs = (argv as any).stateDirs || []
    if (stateDirs.length > 0) {
        await execAsync("rm -rf ./tmp-tf-cache-inkdrop && mkdir ./tmp-tf-cache-inkdrop",
            {
                cwd: path.resolve((argv as any).path || "."),
                maxBuffer: MAX_BUFFER_SIZE
            })
    }
    for (const stateDir of stateDirs) {
        await retrieveRemoteState(stateDir, graphCommand)
    }
    await cleanup()

    const ci = (argv as any).ci || false
    const svg = (argv as any).svg || false

    if (ci || svg) {
        runHeadlessBrowserAndExportSVG(server, argv)
    } else {
        openUrl(`http://localhost:${PORT}/`);
    }
}

runTerraformCommands()