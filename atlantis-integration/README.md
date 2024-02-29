# Custom Atlantis Docker Image with Inkdrop Integration

## Overview
This custom Docker image enhances the Atlantis workflow by integrating Inkdrop to automatically generate and publish interactive plan diagrams within GitHub pull requests. This visualization aids in understanding the changes proposed by Terraform plans more intuitively. Currently, the solution is designed to work exclusively with GitHub.

In addition, users can install the Inkdrop Chrome extension to experience the interactive diagrams directly on your browser. 

**Note:** As of now, the image only supports Atlantis based on the Debian base image; Alpine is not supported.

### Features
- Atlantis server with integrated Inkdrop for interactive diagram visualizations.
- Works with GitHub pull requests.
- Interactive diagrams with [Inkdrop Chrome Extension](https://chromewebstore.google.com/detail/visualize-your-terraform/pddpcicnnongifmhilbamagnhiiibkki).

## Build Instructions
To build the custom Atlantis Docker image, run the following command. You can replace `latest` with a specific version of Atlantis if needed.

```bash
docker build --build-arg ATLANTIS_VERSION=latest -t inkdrop-atlantis .
```

## Running the Container
Start the Atlantis server with the command below. Ensure to replace the placeholders `<ATLANTIS_GH_USER>`, `<ATLANTIS_GH_TOKEN>`, `<GITHUB_WEBHOOK_SECRET>`, and `<ATLANTIS_URL>` with your actual GitHub user, token, webhook secret, and Atlantis URL respectively.
`--write-git-creds` is required by Inkdrop to be able to push rendering data to the repository and publish comments to the PR.

```bash
docker run -p 4141:4141 inkdrop-atlantis server \
  --repo-allowlist=github.com/<YOUR_ORG>/<YOUR_REPO> \
  --gh-user=<ATLANTIS_GH_USER> \
  --gh-token=<ATLANTIS_GH_TOKEN> \
  --gh-webhook-secret=<GITHUB_WEBHOOK_SECRET> \
  --atlantis-url=<ATLANTIS_URL> \
  --repo-config=/home/atlantis/atlantis.yaml \
  --write-git-creds
```