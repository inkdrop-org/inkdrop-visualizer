Inkdrop is a handy CLI tool that creates diagrams to visualize your Terraform configurations.
It helps you visualize dependencies between resources and explore changes in your AWS architecture.

# Overview
We built Inkdrop because keeping track of large Terraform configs is hard. Seeing a visual map of your resources helps you reason about the relationships and dependencies.

Inkdrop takes your Terraform and renders it as an SVG image.
It works entirely locally - just point it at your Terraform directory and you'll get a clean architecture overview in seconds. No messy setup needed.

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
terraform plan -out=plan.out
inkdrop --from-plan plan.out
```

Now Inkdrop will show you exactly what resources will change.

No credentials needed - it works anywhere terraform init does. It runs locally & we don't collect any data.

# Configuration
No complex configuration required! As long as you can run terraform init, Inkdrop will work.
In the future we may add options to filter resources by tag or layer. Let us know if you have suggestions!

# Development
We welcome contributions and feedback! Feel free to open GitHub issues for bugs or feature requests.

We are currently working on an interactive diagram allowing you to zoom, pan, search, drill down into resources and toggle resources on/off.

Feel free to reach out:

antoine@inkdrop.ai

https://calendly.com/antoine-inkdrop/30min
