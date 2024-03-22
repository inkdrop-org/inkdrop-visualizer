Inkdrop is a CLI tool that creates interactive diagrams to visualize your Terraform configurations. It helps you to understand dependencies between resources and explore changes in your AWS architecture.

## Start here:
[Try an interactive demo](https://demo.inkdrop.ai/) 

[See a CI integration](https://github.com/inkdrop-org/inkdrop-gh-action-example) 

## Overview
We built Inkdrop because keeping track of large Terraform configs is hard. Seeing a visual map of your resources helps you reason about the relationships and dependencies.

Inkdrop takes your Terraform config and locally renders it as an interactive webUI, allowing you to get a clean architecture overview in seconds

Benefits:
- Visualize your terraform plans to review changes at a glance.
- Use tags and filters to get an overview of a new project fast.
- Detect Drift, Edit and Document Infrastructure - Coming soon

Turn This            |  Into this
:-------------------------:|:-------------------------:
![image](https://github.com/inkdrop-org/inkdrop-visualizer/assets/86591160/073fbeb8-d67c-449d-adce-3426bddc9276) | ![Screenshot 2024-03-22 112820](https://github.com/inkdrop-org/inkdrop-visualizer/assets/86591160/399316ce-e9e9-4c46-a0e2-9e44dac1e802)

## Installation
You can install Inkdrop with Brew, as a Linux binary or with NPM :

**Install via Brew:**

```
brew tap inkdrop-org/inkdrop-visualizer
brew install inkdrop-visualizer
```
**Install via Linux:**

```
wget https://github.com/inkdrop-org/inkdrop-visualizer/releases/latest/download/inkdrop-linux-x64.tar.gz
tar -xzf inkdrop-linux-x64.tar.gz
chmod +x inkdrop
mv inkdrop /usr/local/bin/
```
Because we rely on Puppeteer to render our diagrams, there may be additional dependencies needed for installation on Linux. You can find the required installations in their [docs](https://pptr.dev/troubleshooting#chrome-doesnt-launch-on-linux).

**Install via NPM:**

```
npm install -g inkdrop-visualizer
```
## CLI Usage
Run inkdrop where you would run Terraform init/plan.
```
terraform plan -out plan.out
inkdrop plan.out
```
This will launch an interactive WebUI showing you which resources will change according to your tf.plan.

When you click on a resource you will get additional details such as variables and outputs used. 

At the top left of the UI you can filter the diagram by resource type, tags and other built-in debugging filters . 

### Command Line Arguments

| Argument           | Description                                                           | Example Usage                              |
|--------------------|-----------------------------------------------------------------------|--------------------------------------------|
| (no argument)      | Automatically launches a browser tab to display the diagram interactively.| `inkdrop`                              |
| `plan-filename`   | Visualizes the impact of changes defined in a specified terraform plan file. | `inkdrop plan.out`                  |
| `--help`, `-h`     | Displays help information about the CLI tool and its commands.        | `inkdrop --help`                           |
| `--version`, `-v`  | Shows the current version number of the CLI tool.                     | `inkdrop --version`                        |
| `--debug`          | Shows the logs of the diagram generation.                             | `inkdrop --debug`                          |
| `--path`           | Sets the working directory to a specified Terraform project path.     | `inkdrop --path ./repos/my-tf-project`     |
| `--renderer-port`  | Defines the port for the local diagram rendering service (default: `3000`). | `inkdrop --renderer-port 8080`       |

Note: Without a plan file the diagram will be missing the current state of the resources, variables, outputs and some filters.

## CI Usage

To run inkdrop from your CI process you will need to follow the following short tutorials: 

[Github example](/github-action-integration)

[Atlantis example](/atlantis-integration)

The runner will comment an SVG Image in the PR. Using the Inkdrop extension this image becomes interactive and behaves like the CLI version when you click on it.

### Troubleshooting

If you encounter any issues while using inkdrop, please use the `--debug` flag and report the issue. We're looking forward to help.

### Telemetry
As this is a local CLI tool we have no information about your setup. The only telemetry we collect is a simple ping to our server, to estimate usage of the tool. 
To turn it off simply use the flag `--telemetry-off`

### Development
We welcome contributions and feedback! Feel free to open GitHub issues for bugs or feature requests.

We are currently deciding which feature to build next according to user feedback.

Feel free to reach out:

antoine@inkdrop.ai

https://calendly.com/antoine-inkdrop/25-min
