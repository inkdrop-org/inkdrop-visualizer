import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { version } from '../../package.json';

export const argv = yargs(hideBin(process.argv))
    .strict()
    .scriptName("inkdrop")
    .usage('$0 [planfile] [args]')
    .command('$0 [planfile]', 'Generates a diagram of your Terraform resources. Automatically launches a browser tab to display the diagram interactively.', (yargs) => {
        yargs.positional('planfile', {
            describe: 'Visualizes the impact of changes defined in a specified Terraform plan file.',
            type: 'string'
        });
    })
    .option('all-plans-in-tree', {
        describe: 'Visualizes all plans in the current directory tree.',
        type: 'boolean',
        example: "inkdrop plan.out --all-plans-in-tree",
    })
    .option('ci', {
        describe: 'Enables CI mode, which does not open the browser and logs extra details, that are used by the Inkdrop Chrome extension',
        type: 'boolean',
        example: "inkdrop --ci",
    })
    .option('detailed', {
        describe: 'Includes comprehensive details for all rendered resources.',
        type: 'boolean',
        example: "inkdrop --detailed",
    })
    .option('debug', {
        describe: 'Enables debug mode.',
        type: 'boolean',
        example: "inkdrop --debug",
    })
    .options('modules', {
        describe: 'In CI mode, create a diagram for each specified module',
        type: 'array',
        example: "inkdrop --ci --modules module1 module2",
    })
    .option('path', {
        describe: 'Sets the working directory to a specified Terraform project path.',
        type: 'string',
    })
    .option('renderer-port', {
        default: 3000,
        describe: 'Defines the port for the local diagram rendering service.',
        type: 'number',
    })
    .option('show-unchanged', {
        describe: 'Displays also resources with no changes in a Terraform plan.',
        type: 'boolean',
    })
    .option('svg', {
        describe: 'Saves an SVG of the diagram locally.',
        type: 'boolean',
    })
    .option('telemetry-off', {
        describe: 'Disables telemetry data collection.',
        type: 'boolean',
    })
    .option('disable-sandbox', {
        describe: 'run chrome with the --no-sandbox flag. Needed in certain ci environments that lack normal sandboxing capabilities',
        type: 'boolean',
    })
    .option('opacity-full', {
        describe: 'Sets the opacity of unchanged resources to 100%.',
        type: 'boolean',
    })
    .option('state-dirs', {
        describe: 'List of directories that contain Terraform configuration files with configured backends. This option allows visualizing multiple states in a single diagram.',
        type: 'array',
    })
    .version('version', 'Show version number', version)
    .alias('version', 'v')
    .example([
        ['$0', 'Generates a diagram and opens its interactive version in a browser.'],
        ['$0 plan.out', 'Uses a Terraform plan file to visualize changes.'],
        ['$0 plan.out --all-plans-in-tree', 'Visualizes all plan files named plan.out in the current directory tree.'],
        ['$0 --ci', 'Enables CI mode, which does not open the browser and logs extra details.'],
        ['$0 --detailed', 'Generates a diagram with comprehensive details for all resources.'],
        ['$0 --debug', 'Enables debug mode.'],
        ['$0 --ci --modules module1 module2', 'In CI mode, creates a diagram for each specified module.'],
        ['$0 --path ./repos/my-tf-directory', 'Sets the working directory.'],
        ['$0 --renderer-port 8080', 'Sets a custom rendering service port.'],
        ['$0 plan.out --state-dirs ./path/to/tf/dir1 ./path/to/tf/dir2', 'Retrieves state information from multiple configured environments.'],
        ['$0 plan.out --show-unchanged', 'Visualizes changes including resources with no changes.'],
        ['$0 plan.out --svg', 'Saves an SVG of the diagram locally.'],
        ['$0 plan.out --show-unchanged --opacity-full', 'Sets the opacity of unchanged resources to 100%.'],
        ['$0 --telemetry-off', 'Disables telemetry data collection.'],
    ])
    .help()
    .alias('help', 'h')
    .argv;