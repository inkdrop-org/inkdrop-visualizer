# Intro
This page is a guide on how to add Inkdrop to your Atlantis workflow.

![image](https://github.com/inkdrop-org/inkdrop-ci-chrome-extension/assets/86591160/ebcd7d11-3827-43cc-9e42-2307877a2023)
If you'd like to see Inkdrop in action in a repository here is a [link](https://github.com/inkdrop-org/inkdrop-atlantis-example/pull/2).

Adding inkdrop to your CI process will allow you to:

- Review Terraform pull requests faster.
- Understand and document changes to your infrastructure.
- Enable software developers and junior devops to review their changes with more confidence.

Inkdrop uses an existing plan file and transforms it into an interactive diagram.

## Installation of Atlantis

### 1. Be sure to use Debian-based Atlantis
In your Atlantis Dockerfile, use the image tagged `latest-debian`, or another Debian version. 

```Dockerfile
FROM ghcr.io/runatlantis/atlantis:latest-debian
```
Note: We currently rely on Puppeteer to render the diagram which is not compatible with linux-alpine.

### 2. Add the Inkdrop installation steps
```Dockerfile
USER root

RUN curl --output inkdrop-linux-x64.tar.gz -L https://github.com/inkdrop-org/inkdrop-visualizer/releases/latest/download/inkdrop-linux-x64.tar.gz
RUN apt update

COPY deb-dependencies.txt /home/atlantis
RUN apt install -y $(cat /home/atlantis/deb-dependencies.txt)

RUN tar -xvf inkdrop-linux-x64.tar.gz
RUN chmod +x inkdrop
RUN mv inkdrop /usr/local/bin
COPY atlantis.yaml /home/atlantis
COPY comment-pr.sh /home/atlantis
USER atlantis
```

### 3. Edit Atlantis server config
Inkdrop needs a Terraform plan file to create the interactive diagram.

Update the Atlantis server configuration yaml so that it saves the plan file, as follows:
```yaml
workflows:
  inkdrop:
    plan:
      steps:
      - init
      - plan:
          extra_args: ["-out", "plan.out"] #Saves the terraform plan
```

Add a post workflow hook
```yaml
repos:
  # ... the rest of your configuration
  workflow: inkdrop
  post_workflow_hooks:
    - commands: plan
      description: Run Inkdrop and comment on PR
      run: inkdrop --ci plan.out &&
        /home/atlantis/comment-pr.sh
```

This will comment the pull request with an image of the created diagram.

Note: To make the image interactive you will need to download the [inkdrop extension](https://chromewebstore.google.com/detail/visualize-your-terraform/pddpcicnnongifmhilbamagnhiiibkki) 

To interact with the diagram simply click on the commented image, this will open a local chrome tab with all functionalities.

We decided to go with an Atlantis integration + extension as this keeps all data completely local and doesn't require you to spin up a self-hosted version or to deal with authenication & credentials.


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
  --write-git-creds #Add this argument
```


## Questions and Feedback
Feel free to reach out should you run into any issues! We welcome contributions and feedback!

[Open an Github Issue](https://github.com/inkdrop-org/inkdrop-visualizer/issues/new)

antoine@inkdrop.ai

https://calendly.com/antoine-inkdrop/25-min
