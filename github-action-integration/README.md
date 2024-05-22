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

        # optional parameters
        terraform_relative_dir: . # Specify the relative directory of your Terraform configuration. 
        data_branch_name: # Specify the name of the branch to store the Inkdrop images.  Defaults to inkdrop-ci-data
        inkdrop_version: # Specifies the version of Inkdrop to use (in the format vX.Y.Z) Defaults to latest       
        diagram_readme: true # Creates a diagram on the README at the root of the project. Defaults to true
        modules_diagram_readme: true # Creates a diagram for each directory containing a Terraform module. Defaults to true
   ```
This will comment the pull request with an interactive Terraform diagram.

To interact with the diagram simply click on the commented image, this will open a local chrome tab with all functionalities.

Note: To make the image interactive seamlessly you will need to download the [inkdrop extension](https://chromewebstore.google.com/detail/visualize-your-terraform/pddpcicnnongifmhilbamagnhiiibkki) 

## Misc

We decided to go with a Github action + extension as this keeps all data completely local and doesn't require you to spin up a self-hosted version or to deal with authenication & credentials.

### Automatically Updating Your README with Terraform Diagrams

Inkdrop can automatically update your Terraform project's README with the latest Terraform interactive diagrams. This feature ensures your documentation includes an up-to-date representation of your infrastructure.

When enabled, Inkdrop will:
- Check if your repository has a README.
  - If not, it creates one containing the diagram.
  - If yes, it looks for a placeholder `![Inkdrop Diagram](...)` to replace with the diagram. Without a placeholder, the diagram is not added.

The feature is controlled by the following inputs:
```yaml
inkdrop-run:
    needs: plan
    uses: inkdrop-org/inkdrop-visualizer/.github/workflows/inkdrop-plan.yml@main
    with:
      #...other Inkdrop settings
      diagram_readme: true # Creates a diagram on the README at the root of the project. Defaults to true
      modules_diagram_readme: true # Creates a diagram for each directory containing a Terraform module. Defaults to true
```

The README diagram is interactive, allowing viewers to click and open a local Chrome tab with full functionalities, similar to the PR comment diagram.

### Configuration

The only thing you need to specify is your Terraform version. Other fields are optional and give you more freedom about your implementation.

| Name                   | Description                                                    | Type   | Default             | Required |
|------------------------|----------------------------------------------------------------|--------|---------------------|----------|
| `terraform_version`    | Specifies the version of Terraform to use.                     | string | -                    | Yes      |
| `plan_artifact`        | Defines the name of the artifact containing the Terraform plan file. | string | -     | Yes       |
| `plan_file_name`       | Specifies the name of the Terraform plan file to be visualized.| string | -          | Yes       |
| `terraform_relative_dir` | Indicates the relative directory of your Terraform configuration. | string | `.`               | No       |
| `data_branch_name`        | Names the branch to store the Inkdrop images.                  | string | `inkdrop-ci-data` | No       |
| `inkdrop_version`      | Specifies the version of Inkdrop to use (in the format vX.Y.Z).| string | `latest`            | No       |
| `diagram_readme`      | Enables automated updating or creation of README with Terraform diagrams.| boolean | `true` | No       |
| `modules_diagram_readme` | Creates a diagram for each directory containing a Terraform module in the README.| boolean | `true`  | No       |

Here's a link to a [github action example](/github-action-integration/example-plan-and-run-inkdrop.yml)

### Questions and Feedback
Feel free to reach out should you run into any issues! We welcome contributions and feedback!

[Open an Github Issue](https://github.com/inkdrop-org/inkdrop-visualizer/issues/new)

antoine@inkdrop.ai

https://calendly.com/antoine-inkdrop/25-min
