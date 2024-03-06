import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { version } from '../../package.json';

export const argv = yargs(hideBin(process.argv))
    .strict()
    .scriptName("inkdrop")
    .usage('$0 [planfile] [args]')
    //.command(['$0'], 'Generates an SVG image of your Terraform resources. Automatically launches a browser tab to display the diagram interactively.', () => { })
    .command('$0 [planfile]', 'Generates an SVG image of your Terraform resources. Automatically launches a browser tab to display the diagram interactively.', (yargs) => {
        yargs.positional('planfile', {
            describe: 'Visualizes the impact of changes defined in a specified Terraform plan file.',
            type: 'string'
        });
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
    .option('disable-ui', {
        describe: 'Saves the SVG diagram locally without opening the interactive renderer in a browser.',
        type: 'boolean',
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
    .option('telemetry-off', {
        describe: 'Disables telemetry data collection.',
        type: 'boolean',
    })
    .version('version', 'Show version number', version)
    .alias('version', 'v')
    .example([
        ['$0', 'Generates an SVG and opens the interactive renderer in a browser.'],
        ['$0 plan.out', 'Uses a Terraform plan file to visualize changes.'],
        ['$0 --ci', 'Enables CI mode, which does not open the browser and logs extra details.'],
        ['$0 --detailed', 'Generates a diagram with comprehensive details for all resources.'],
        ['$0 --debug', 'Enables debug mode.'],
        ['$0 --disable-ui', 'Saves the SVG locally without launching the browser.'],
        ['$0 --path ./repos/my-tf-project', 'Sets the working directory.'],
        ['$0 --renderer-port 8080', 'Sets a custom rendering service port.'],
        ['$0 plan.out --show-unchanged', 'Visualizes changes including resources with no changes.'],
        ['$0 --telemetry-off', 'Disables telemetry data collection.'],
    ])
    .help()
    .alias('help', 'h')
    .argv;