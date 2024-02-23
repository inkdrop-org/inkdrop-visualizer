#!/bin/bash

# Extract the GitHub token from the .git-credentials file
GITHUB_CREDENTIALS_PATH="/home/atlantis/.git-credentials"

GITHUB_TOKEN=$(awk -F '://' '{print $2}' "$GITHUB_CREDENTIALS_PATH" | cut -d '@' -f 1 | cut -d ':' -f 2)

# Ensure the token was extracted
if [ -z "$GITHUB_TOKEN" ]; then
  echo "Failed to extract GitHub token from $GITHUB_CREDENTIALS_PATH"
  exit 1
fi

IMAGES_BRANCH="inkdrop-ci-images"
SVG_FILE="$(ls -Art *.svg | tail -n 1)"
GITHUB_API_URL="https://api.github.com"
CONTENT_PATH="images/PR${PULL_NUM}/$(printf %s "$SVG_FILE"|jq -sRr @uri)"
echo "SVG_FILE: $SVG_FILE"
echo "CONTENT_PATH: $CONTENT_PATH"
TMP_DIR=$(mktemp -d)

# Make sure to remove TMP_DIR, even if script fails
trap 'rm -rf -- "$TMP_DIR"' EXIT

# Step 1: Check if branch exists and create it if not
echo "Checking if '${IMAGES_BRANCH}' branch exists..."
BRANCH_EXISTS=$(git ls-remote --heads origin $IMAGES_BRANCH | wc -l)
if [ "$BRANCH_EXISTS" -eq "0" ]; then
  echo "Creating branch '${IMAGES_BRANCH}'..."
  git init "$TMP_DIR"
  cd "$TMP_DIR"
  git remote add origin https://github.com/${HEAD_REPO_OWNER}/${HEAD_REPO_NAME}.git
  echo "### Branch used to store Inkdrop CI images" > README.md
  git add README.md
  git commit -m "Initial commit on orphan branch ${IMAGES_BRANCH}"
  git push --set-upstream origin master:${IMAGES_BRANCH}
  echo "Branch '${IMAGES_BRANCH}' created."
else
  echo "Branch '${IMAGES_BRANCH}' already exists."
fi

# Step 2: Upload SVG to the branch
echo "Uploading SVG to the branch..."
SVG_CONTENT_BASE64=$(base64 -w 0 "$SVG_FILE")
echo "SVG_CONTENT_BASE64: $SVG_CONTENT_BASE64"
UPLOAD_URL="${GITHUB_API_URL}/repos/${HEAD_REPO_OWNER}/${HEAD_REPO_NAME}/contents/${CONTENT_PATH}"
echo "UPLOAD_URL: $UPLOAD_URL"

curl -X PUT $UPLOAD_URL \
-H "Authorization: Bearer ${GITHUB_TOKEN}" \
-H "Content-Type: application/json" \
-d @- << EOF
{
  "message": "Add SVG for PR ${PULL_NUM}",
  "content": "${SVG_CONTENT_BASE64}",
  "branch": "${IMAGES_BRANCH}"
}
EOF

echo "SVG uploaded."

echo $(cat inkdrop-ci-data.json)

INKDROP_DATA_JSON=$(jq -Rs . inkdrop-ci-data.json)

# Use jq to construct the entire request payload to ensure proper escaping.
JSON_PAYLOAD=$(jq -n --arg body "### Inkdrop Data Output\n\`\`\`json\n${INKDROP_DATA_JSON}\n\`\`\`" '{body: $body}')


# Step 3: Post comment with SVG on the PR
SVG_URL="https://github.com/${HEAD_REPO_OWNER}/${HEAD_REPO_NAME}/blob/${IMAGES_BRANCH}/${CONTENT_PATH}?raw=true"
COMMENT_BODY="### Inkdrop Diagram\n![Inkdrop Diagram SVG](${SVG_URL})"

echo "Posting Inkdrop data on PR #${PULL_NUM}..."
curl -s -X POST "${GITHUB_API_URL}/repos/${HEAD_REPO_OWNER}/${HEAD_REPO_NAME}/issues/${PULL_NUM}/comments" \
     -H "Authorization: token ${GITHUB_TOKEN}" \
     -H "Content-Type: application/json" \
     -d "$JSON_PAYLOAD"

echo "Posting Inkdrop diagram on PR #${PULL_NUM}..."
curl -s -X POST "${GITHUB_API_URL}/repos/${HEAD_REPO_OWNER}/${HEAD_REPO_NAME}/issues/${PULL_NUM}/comments" \
-H "Authorization: token ${GITHUB_TOKEN}" \
-H "Content-Type: application/json" \
-d "{\"body\": \"${COMMENT_BODY}\" }"

echo "Comment posted."