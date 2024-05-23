# Inkdrop Github Action
Add Inkdrop to your GitHub workflow to visualize your Terraform infrastructure changes and review pull requests faster.
<p align="center">
  <picture width="500px" align="center">
      <img alt="Inkdrop-Example" src="https://github.com/inkdrop-org/inkdrop-ci-chrome-extension/assets/86591160/ebcd7d11-3827-43cc-9e42-2307877a2023" width="500px" align="center">
  </picture>
</p>

<p align="center">
  <a href="https://github.com/inkdrop-org/inkdrop-gh-action-example/pull/5">🚀 See it in Action</a> |
  <a href="https://github.com/inkdrop-org/inkdrop-visualizer/github-action-integration/example-plan-and-run-inkdrop.yml">📄 Example Workflow</a> |
  <a href="https://github.com/inkdrop-org/inkdrop-visualizer/issues/new">📣 Give Feedback</a> |
  <a href="https://join.slack.com/t/inkdrop-group/shared_invite/zt-2jjbx5wz4-lyN4YLzlwuccD00rnMTDew">🙌 Join Slack</a>
</p>

## Installation
**Create a Terraform plan file and save it as an artifact**
```yaml
jobs:
  plan:

        #...The rest of your job

        - name: Terraform Init and Plan
          working-directory: .
          run: |
            terraform init
            terraform plan -out plan.out                       # Create and save a plan file
          env:
            AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
            AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        
        - name: Upload Terraform Plan as an artifact
          uses: actions/upload-artifact@v4
          with:
            name: plan-artifact
            path: ./plan.out
```
**Add the Inkdrop job to your workflow**
```yaml
jobs:
  plan:
        #...Your plan job

  inkdrop-run:
      needs: plan
      uses: inkdrop-org/inkdrop-visualizer/.github/workflows/inkdrop-plan.yml@main
      with:
        terraform_version: 1.7.0 # Your terraform version - Mandatory
        plan_artifact: plan-artifact # The artifact name - Mandatory (Set in previous job)
        plan_file_name: plan.out # The name of the plan file - Mandatory (Set in previous job)

   ```
This will comment the pull request with an interactive Terraform diagram. To interact with the diagram simply click on the commented image, this will open a local chrome tab with all functionalities.

> **Note:** For an enhanced experience, install the [Inkdrop Extension](https://chromewebstore.google.com/detail/visualize-your-terraform/pddpcicnnongifmhilbamagnhiiibkki) to interact with the diagrams seamlessly.

## Optional Configuration

These are optional fields to give you more freedom about your implementation.

| Name                   | Description                                                    | Type   | Default             |
|------------------------|----------------------------------------------------------------|--------|---------------------|
| `terraform_relative_dir `   |  Specifies the relative directory of your Terraform configuration. |string|.|
| `data_branch_name`        | Names the branch to store the Inkdrop images.                  | string | `inkdrop-ci-data` |
| `inkdrop_version`      | Specifies the version of Inkdrop to use (in the format vX.Y.Z).| string | `latest`            |
| `diagram_readme`      | Enables automated updating or creation of README with Terraform diagrams.| boolean | `true` |
| `modules_diagram_readme` | Creates a diagram for each directory containing a Terraform module in the README.| boolean | `true`  |
| `webhook_url` | Specifies the URL listening to the webhook.                          | string | - |

**Optional: Automatically update your documentation**

```yaml
inkdrop-run:
    needs: plan
    uses: inkdrop-org/inkdrop-visualizer/.github/workflows/inkdrop-plan.yml@main
    with:
      #...other Inkdrop settings
      diagram_readme: true # Creates a diagram in the README at the root
      modules_diagram_readme: true # Creates a diagram for each Terraform module directory
      webhook_url: ${{ secrets.WEBHOOK_URL }} # URL of the webhook to send the diagram and link
```

`diagram_readme` and `modules_diagram_readme` will check if the directory has a README and replace the `![Inkdrop ]()` with the latest visualization of the infrastructure. If no README is found it creates one containing the diagram.

`webhook_url`: If provided, the action will send a webhook payload to the specified URL with the generated diagram image and a link to the Inkdrop visualization tool for the current pull request. 

The payload will be in JSON format, containing the following fields:

`image`: The Base64-encoded diagram image

`link`: The URL to the Inkdrop visualization tool for the current pull request

> **Note:** We decided to go with a Github action + extension as this keeps all data completely local and doesn't require you to spin up a self-hosted version or to deal with authenication & credentials.

### Questions and Feedback
Feel free to reach out should you run into any issues! We welcome contributions and feedback!

[Open an Github Issue](https://github.com/inkdrop-org/inkdrop-visualizer/issues/new)

[Slack](https://join.slack.com/t/inkdrop-group/shared_invite/zt-2jjbx5wz4-lyN4YLzlwuccD00rnMTDew)

[Email](mailto:antoine@inkdrop.ai)

[Calendar](https://calendly.com/antoine-inkdrop/25-min)
