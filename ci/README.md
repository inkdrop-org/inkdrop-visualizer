# Reusable GitHub Action: Visualize Your Terraform Plan in Pull Requests

[Inkdrop GitHub Action](/.github/workflows/inkdrop-plan.yml) is designed to streamline the Terraform planning and visualization processes. It integrates Terraform plan execution with Inkdrop.
This action generates an Inkdrop diagram of your Terraform plan and automatically publishes it to the pull request.
To maximize benefits, installation of the Inkdrop Chrome extension is recommended. This enables you to open the interactive version of the diagram, which runs locally on your Chrome browser, by simply clicking on the commented image in the PR.

## Inputs

| Name                   | Description                                                    | Type   | Default             | Required |
|------------------------|----------------------------------------------------------------|--------|---------------------|----------|
| `terraform_version`    | Specifies the version of Terraform to use.                     | string |                     | Yes      |
| `plan_artifact`        | Defines the name of the artifact containing the Terraform plan file. | string | `plan-artifact`     | No       |
| `plan_file_name`       | Specifies the name of the Terraform plan file to be visualized.| string | `plan.out`          | No       |
| `terraform_relative_dir` | Indicates the relative directory of your Terraform configuration. | string | `.`               | No       |
| `images_branch`        | Names the branch to store the Inkdrop images.                  | string | `inkdrop-ci-images` | No       |
| `inkdrop_version`      | Specifies the version of Inkdrop to use (in the format vX.Y.Z).| string | `latest`            | No       |

## Usage

Refer to the [example](example-plan-and-run-inkdrop.yml).