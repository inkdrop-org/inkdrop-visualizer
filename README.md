<p align="center">
  <picture width="100px" align="center">
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/inkdrop-org/inkdrop-visualizer/assets/86591160/f93f558f-81e8-4d70-9dcd-d7512b3a47d4">
      <img alt="Inkdrop" src="https://github.com/inkdrop-org/inkdrop-visualizer/assets/86591160/cfe32c6e-3634-4d68-9749-d2c2d0468ecc" width="100px" align="center">
    </picture>
  <h1 align="center">Terraform Visualizer</h1>
  <p align="center">
    Inkdrop is a CLI tool that creates interactive diagrams to visualize your Terraform. 
    <br/>
    It helps you onboard engineers, generate documentation and understand dependencies faster. 
  </p>
</p>
<p align="center">
  <a href="https://github.com/inkdrop-org/inkdrop-visualizer/releases"><img src="https://img.shields.io/github/v/release/inkdrop-org/inkdrop-visualizer?color=%239F50DA&display_name=tag&label=Version" alt="Latest Release" /></a>
  <a href="https://github.com/inkdrop-org/inkdrop-visualizer/graphs/commit-activity"><img src="https://img.shields.io/github/commit-activity/m/inkdrop-org/inkdrop-visualizer" alt="Commit Activity" /></a>
  <a href="https://github.com/inkdrop-org/inkdrop-visualizer/stargazers" rel="nofollow"><img src="https://img.shields.io/github/stars/inkdrop-org/inkdrop-visualizer" alt="Stars"></a>
</p>

<p align="center">
  <picture align="center">
    <a href="https://demo.inkdrop.ai/"><img src="https://github.com/inkdrop-org/inkdrop-visualizer/assets/86591160/5de99a85-2636-40c8-b82d-7f64c7dc7178" alt="demo"></a> 
  </picture>
</p>
<p align="center">
  <a href="https://github.com/inkdrop-org/inkdrop-gh-action-example/pull/5">🚀 CI Integration</a> | <a href="https://demo.inkdrop.ai">💻 Interactive Demo</a> | <a href="https://github.com/inkdrop-org/inkdrop-visualizer/issues/new">🙌 Give Feedback</a>
</p>

## Overview
Inkdrop generates a visual, interactive map of your resources helps you understand relationships and dependencies.

Inkdrop takes your Terraform Plan and renders it locally as an interactive WebUI, allowing you to get a clean overview in seconds.

Benefits:
- Review proposed changes at a glance.
- Document your infrastructure automatically.
- Onboard engineers to a new project 10 times faster.

![Static Badge](https://img.shields.io/badge/Note%3A%20-%20Inkdrop%20currently%20only%20works%20for%20AWS%20resources.-blue)

## Quick Install
**With Brew:**

```
brew tap inkdrop-org/inkdrop-visualizer
brew install inkdrop-visualizer
```
**With Linux:**

```
wget https://github.com/inkdrop-org/inkdrop-visualizer/releases/latest/download/inkdrop-linux-x64.tar.gz
tar -xzf inkdrop-linux-x64.tar.gz
chmod +x inkdrop
mv inkdrop /usr/local/bin/
```

**With NPM:**

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

![Static Badge](https://img.shields.io/badge/%20Note%3A-%20Without%20a%20plan%20file%20the%20diagram%20will%20be%20missing%20some%20functionality-blue)


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

https://calendly.com/alberto-inkdrop/30min
