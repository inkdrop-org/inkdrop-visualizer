Inkdrop is a CLI tool that creates diagrams to visualize your Terraform configurations.
It helps you visualize dependencies between resources and explore changes in your AWS architecture.

# Overview
We built Inkdrop because keeping track of large Terraform configs is hard. Seeing a visual map of your resources helps you reason about the relationships and dependencies.

Inkdrop takes your Terraform config and locally renders it as an interactive webUI, allowing you to get a clean architecture overview in seconds

Benefits:
- Visualize your terraform plans to review changes at a glance.
- Use tags and filters to review security postures or networking of projects.
- Explore your dependencies and variables to get an overview of a new architecture.

Turn this:

![CreateaNewPen-GoogleChrome2024-01-2518-05-55-ezgif com-optimize](https://github.com/inkdrop-org/inkdrop-visualizer/assets/86591160/073fbeb8-d67c-449d-adce-3426bddc9276)

Into this:

![output-onlinejpgtools](https://github.com/inkdrop-org/inkdrop-visualizer/assets/86591160/38eaae22-9d68-430c-99ab-a2d2dd49085c)

# Usage and Deployment
Using Inkdrop is simple:

**Install via NPM:**

```
npm install -g inkdrop-visualizer
```

Run in your Terraform directory:

```
terraform plan -out plan.out
inkdrop --from-plan plan.out
```
This will launch an interactive WebUI showing you exactly what resources will change. If you click on a resource you will get additional details such as variables and outputs used.

Note: You can also run inkdrop without a plan but it will currently be missing tags, variables and feature toggles.

# Command Line Arguments

| Argument           | Description                                                           | Example Usage                               |
|--------------------|-----------------------------------------------------------------------|---------------------------------------------|
| (no argument)      | Generates an SVG image of your Terraform resources. Automatically launches a browser tab to display the diagram interactively. | `inkdrop`                                   |
| `--from-plan`      | Visualizes the impact of changes defined in a specified Terraform plan file. | `inkdrop --from-plan plan.out`              |
| `--path`           | Sets the working directory to a specified Terraform project path.     | `inkdrop --path ./repos/my-tf-project`      |
| `--renderer-port`  | Defines the port for the local diagram rendering service (default: `3000`). | `inkdrop --renderer-port 8080`             |
| `--help`, `-h`     | Displays help information about the CLI tool and its commands/options. | `inkdrop --help`                           |
| `--version`, `-v`  | Shows the current version number of the CLI tool.                     | `inkdrop --version`                        |

# Troubleshooting

If you encounter any issues while using command line arguments, make sure you are using the latest version of Inkdrop by updating it via npm:

```
npm update -g inkdrop-visualizer
```

Should the issues persist, please use the `--debug` flag and report the issue. We're looking forward to help.

# Configuration
No configuration required! As long as you can run terraform init, Inkdrop will work.
In the UI you can also filter by resource type or tags. 

# Running Inkdrop in CI Process

If you'd like to run inkdrop from your CI process you can just let the runner create an SVG image. 
| Argument           | Description                                                           | Example Usage                               |
|--------------------|-----------------------------------------------------------------------|---------------------------------------------|
| `--disable-ui`     | Saves the SVG diagram locally without opening the interactive renderer in a browser. | `inkdrop --disable-ui`                     |
| `--show-inactive`  | Displays both active and inactive resources within a Terraform plan.  | `inkdrop --from-plan plan.out --show-inactive` |
| `--detailed`       | Includes comprehensive details for all rendered resources.            | `inkdrop --detailed`                        |
| `--filter`       | Let's you select certain filters (resource type or tags) to reduce complexity of the SVG          | `inkdrop --filter "networking, compute"`                        |

We will soon add a more complete guide on how to implement it in Github, Gitlab and using Atlantis.

# Development
We welcome contributions and feedback! Feel free to open GitHub issues for bugs or feature requests.

We are currently working on multi repo environments and making improvements according to user feedback.

Feel free to reach out:

antoine@inkdrop.ai

https://calendly.com/antoine-inkdrop/30min
