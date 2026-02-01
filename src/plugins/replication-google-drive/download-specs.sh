#!/bin/bash
set -e

# This script downloads the Google Drive API v2 and v3 specs.
# So your AI/LLM can read them and understand the API.

# Directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SPECS_DIR="$SCRIPT_DIR/specs"

# Create specs directory if it doesn't exist
mkdir -p "$SPECS_DIR"

# URL 1: Google Drive API v2 JSON
URL1="https://raw.githubusercontent.com/rakyll/drivefuse/refs/heads/master/third_party/code.google.com/p/google-api-go-client/drive/v2/drive-api.json"
FILE1="$SPECS_DIR/drive-api.json"

if [ ! -f "$FILE1" ]; then
    echo "Downloading drive-api.json..."
    curl -L "$URL1" -o "$FILE1" -s
    echo "Downloaded drive-api.json"
else
    echo "drive-api.json already exists, skipping."
fi

# URL 2: Google Drive API v3 OpenAPI YAML
URL2="https://raw.githubusercontent.com/APIs-guru/openapi-directory/refs/heads/main/APIs/googleapis.com/drive/v3/openapi.yaml"
FILE2="$SPECS_DIR/openapi.yaml"

if [ ! -f "$FILE2" ]; then
    echo "Downloading openapi.yaml..."
    curl -L "$URL2" -o "$FILE2" -s
    echo "Downloaded openapi.yaml"
else
    echo "openapi.yaml already exists, skipping."
fi
