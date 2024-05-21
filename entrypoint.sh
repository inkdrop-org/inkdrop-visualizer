#!/bin/sh
export PATH="/.tfenv/bin:$PATH"
tfenv use $TF_VERSION
cd tfroot
INKDROP_DOCKER=true /inkdrop-visualizer/dist/src/index.js $@