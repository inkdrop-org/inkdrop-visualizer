#!/bin/bash

# Extract the GitHub token from the .git-credentials file
GITHUB_CREDENTIALS_PATH="/home/atlantis/.git-credentials"

GITHUB_TOKEN=$(awk -F '://' '{print $2}' "$GITHUB_CREDENTIALS_PATH" | cut -d '@' -f 1 | cut -d ':' -f 2)

# Ensure the token was extracted
if [ -z "$GITHUB_TOKEN" ]; then
  echo "Failed to extract GitHub token from $GITHUB_CREDENTIALS_PATH"
  exit 1
fi

CI_DATA_BRANCH="inkdrop-ci-data"
TMP_DIR=$(mktemp -d)

# Make sure to remove TMP_DIR, even if script fails
trap 'rm -rf -- "$TMP_DIR"' EXIT

# Check if branch exists and create it if not
echo "Checking if '${CI_DATA_BRANCH}' branch exists..."
BRANCH_EXISTS=$(git ls-remote --heads origin $CI_DATA_BRANCH | wc -l)
if [ "$BRANCH_EXISTS" -eq "0" ]; then
  git config --global user.email "atlantis-bot@runatlantis.io"
  git config --global user.name "Atlantis bot"
  echo "Creating branch '${CI_DATA_BRANCH}'..."
  git init "$TMP_DIR"
  cd "$TMP_DIR"
  git remote add origin https://github.com/${HEAD_REPO_OWNER}/${HEAD_REPO_NAME}.git
  echo "### Branch used to store Inkdrop CI images and data" > README.md
  git add README.md
  git commit -m "Initial commit on orphan branch ${CI_DATA_BRANCH}"
  git push --set-upstream origin master:${CI_DATA_BRANCH}
  echo "Branch '${CI_DATA_BRANCH}' created."
  cd -
else
  echo "Branch '${CI_DATA_BRANCH}' already exists."
fi

SVG_FILE="$(ls -Art *.svg | tail -n 1)"
INKDROP_DATA_JSON="inkdrop-ci-data.json"
GITHUB_API_URL="https://api.github.com"
SVG_CONTENT_PATH="inkdrop-data/PR${PULL_NUM}/$(printf %s "$SVG_FILE"|jq -sRr @uri)"
INKDROP_DATA_CONTENT_PATH="inkdrop-data/PR${PULL_NUM}/$(printf %s "$SVG_FILE"|jq -sRr @uri)-${INKDROP_DATA_JSON}"
echo "SVG_FILE=$SVG_FILE"
echo "SVG_CONTENT_PATH=$SVG_CONTENT_PATH"
echo "INKDROP_DATA_JSON=$INKDROP_DATA_JSON"
echo "INKDROP_DATA_CONTENT_PATH=$INKDROP_DATA_CONTENT_PATH"

# Upload SVG to the branch
echo "Uploading SVG to the branch..."
SVG_CONTENT_BASE64=$(base64 -w 0 "$SVG_FILE")
SVG_UPLOAD_URL="${GITHUB_API_URL}/repos/${HEAD_REPO_OWNER}/${HEAD_REPO_NAME}/contents/${SVG_CONTENT_PATH}"
echo "SVG_UPLOAD_URL: $SVG_UPLOAD_URL"

curl -X PUT $SVG_UPLOAD_URL \
-H "Authorization: Bearer ${GITHUB_TOKEN}" \
-H "Content-Type: application/json" \
-d @- << EOF
{
  "message": "Add SVG for PR ${PULL_NUM}",
  "content": "${SVG_CONTENT_BASE64}",
  "branch": "${CI_DATA_BRANCH}"
}
EOF

echo "SVG uploaded."

# Upload Inkdrop data to the branch
echo "Uploading Inkdrop data to the branch..."
INKDROP_DATA_CONTENT_BASE64=$(base64 -w 0 "$INKDROP_DATA_JSON")
JSON_UPLOAD_URL="${GITHUB_API_URL}/repos/${HEAD_REPO_OWNER}/${HEAD_REPO_NAME}/contents/${INKDROP_DATA_CONTENT_PATH}"
echo "JSON_UPLOAD_URL: $JSON_UPLOAD_URL"

curl -X PUT $JSON_UPLOAD_URL \
-H "Authorization: Bearer ${GITHUB_TOKEN}" \
-H "Content-Type: application/json" \
-d @- << EOF
{
  "message": "Add Inkdrop CI JSON for PR ${PULL_NUM}",
  "content": "${INKDROP_DATA_CONTENT_BASE64}",
  "branch": "${CI_DATA_BRANCH}"
}
EOF

echo "Inkdrop data JSON uploaded."

# Post comment with SVG on the PR
SVG_URL="https://github.com/${HEAD_REPO_OWNER}/${HEAD_REPO_NAME}/blob/${CI_DATA_BRANCH}/${SVG_CONTENT_PATH}?raw=true"
COMMENT_BODY="### Inkdrop Diagram\n![Inkdrop Diagram SVG](${SVG_URL})"

echo "Posting Inkdrop diagram on PR #${PULL_NUM}..."
curl -s -X POST "${GITHUB_API_URL}/repos/${HEAD_REPO_OWNER}/${HEAD_REPO_NAME}/issues/${PULL_NUM}/comments" \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"body\": \"${COMMENT_BODY}\" }"

echo "Comment posted."

# Post comment with JSON on the PR
INKDROP_DATA_URL="https://github.com/${HEAD_REPO_OWNER}/${HEAD_REPO_NAME}/blob/${CI_DATA_BRANCH}/${INKDROP_DATA_CONTENT_PATH}"
INKDROP_DATA_COMMENT="Install the [Inkdrop Chrome Extension](https://chromewebstore.google.com/detail/visualize-your-terraform/pddpcicnnongifmhilbamagnhiiibkki) to hide this comment and enable interactive mode.\n### Inkdrop Data\n[Inkdrop Data JSON](${INKDROP_DATA_URL})"

echo "Posting Inkdrop data on PR #${PULL_NUM}..."
curl -s -X POST "${GITHUB_API_URL}/repos/${HEAD_REPO_OWNER}/${HEAD_REPO_NAME}/issues/${PULL_NUM}/comments" \
     -H "Authorization: token ${GITHUB_TOKEN}" \
     -H "Content-Type: application/json" \
     -d "{\"body\": \"${INKDROP_DATA_COMMENT}\" }"