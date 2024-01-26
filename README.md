Inkdrop is a handy CLI tool that creates diagrams to visualize your Terraform configurations.
It helps you visualize dependencies between resources and explore changes in your AWS architecture.

# Overview
We built Inkdrop because keeping track of large Terraform configs is hard. Seeing a visual map of your resources helps you reason about the relationships and dependencies.

Inkdrop takes your Terraform and renders it as an SVG image.
It works entirely locally - just point it at your Terraform directory and you'll get a clean architecture overview in seconds. No messy setup needed.

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
inkdrop
```

This will generate an SVG image of your resources.

For a full diff view, run it on a plan file:

```
terraform plan -out plan.out
inkdrop --from-plan plan.out
```

Now Inkdrop will show you exactly what resources will change.

No credentials needed - it works anywhere terraform init does. It runs locally & we don't collect any data.

# Command Line Arguments

| Argument           | Description                                                           | Example Usage                               |
|--------------------|-----------------------------------------------------------------------|---------------------------------------------|
| (no argument)      | Generates an SVG image of your Terraform resources. Automatically launches a browser tab to display the diagram interactively. | `inkdrop`                                   |
| `--detailed`       | Includes comprehensive details for all rendered resources.            | `inkdrop --detailed`                        |
| `--disable-ui`     | Saves the SVG diagram locally without opening the interactive renderer in a browser. | `inkdrop --disable-ui`                     |
| `--from-plan`      | Visualizes the impact of changes defined in a specified Terraform plan file. | `inkdrop --from-plan plan.out`              |
| `--path`           | Sets the working directory to a specified Terraform project path.     | `inkdrop --path ./repos/my-tf-project`      |
| `--renderer-port`  | Defines the port for the local diagram rendering service (default: `3000`). | `inkdrop --renderer-port 8080`             |
| `--show-inactive`  | Displays both active and inactive resources within a Terraform plan.  | `inkdrop --from-plan plan.out --show-inactive` |


# Troubleshooting

If you encounter any issues while using command line arguments, make sure you are using the latest version of Inkdrop by updating it via npm:

```
npm update -g inkdrop-visualizer
```

# Configuration
No complex configuration required! As long as you can run terraform init, Inkdrop will work.
In the future we may add options to filter resources by tag or layer. Let us know if you have suggestions!

# Development
We welcome contributions and feedback! Feel free to open GitHub issues for bugs or feature requests.

We are currently working on an interactive diagram allowing you to zoom, pan, search, drill down into resources and toggle resources on/off.

Feel free to reach out:

antoine@inkdrop.ai

https://calendly.com/antoine-inkdrop/30min
