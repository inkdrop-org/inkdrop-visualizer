# Inkdrop Github Action
Add Inkdrop to your GitHub workflow to visualize your Terraform infrastructure changes and review pull requests faster.
<p align="center">
  <picture width="100px" align="center">
      <img alt="Inkdrop-Example" src="https://github.com/inkdrop-org/inkdrop-ci-chrome-extension/assets/86591160/ebcd7d11-3827-43cc-9e42-2307877a2023" width="500px" align="center">
  </picture>
</p>



## Installation
**1. Create a Terraform plan file and save it as an artifact**
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
**2. Add the Inkdrop job to your workflow**
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

Note: For a more seamless interaction you can download the [inkdrop extension](https://chromewebstore.google.com/detail/visualize-your-terraform/pddpcicnnongifmhilbamagnhiiibkki) 

**3. Optional: Automatically Update Your Documentation/README with Webhooks**

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

This allows you to integrate the Inkdrop visualization directly into your existing workflow or notification system, making it easier to review infrastructure changes.

## Misc

Here's a link to a [github action example](/github-action-integration/example-plan-and-run-inkdrop.yml)

We decided to go with a Github action + extension as this keeps all data completely local and doesn't require you to spin up a self-hosted version or to deal with authenication & credentials.



### Configuration

These are optional fields to give you more freedom about your implementation.

| Name                   | Description                                                    | Type   | Default             |
|------------------------|----------------------------------------------------------------|--------|---------------------|
| `terraform_relative_dir `   |  Specifies the relative directory of your Terraform configuration. |string|.|
| `data_branch_name`        | Names the branch to store the Inkdrop images.                  | string | `inkdrop-ci-data` |
| `inkdrop_version`      | Specifies the version of Inkdrop to use (in the format vX.Y.Z).| string | `latest`            |
| `diagram_readme`      | Enables automated updating or creation of README with Terraform diagrams.| boolean | `true` |
| `modules_diagram_readme` | Creates a diagram for each directory containing a Terraform module in the README.| boolean | `true`  |

Here's a link to a [github action example](/github-action-integration/example-plan-and-run-inkdrop.yml)

### Questions and Feedback
Feel free to reach out should you run into any issues! We welcome contributions and feedback!

[Open an Github Issue](https://github.com/inkdrop-org/inkdrop-visualizer/issues/new)

antoine@inkdrop.ai

https://calendly.com/antoine-inkdrop/25-min
