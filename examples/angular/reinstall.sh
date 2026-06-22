#!/bin/sh
set -e

rm -rf ./node_modules
rm -rf ./.angular
rm -f rxdb-local.tgz
npm run preinstall
npm cache clean --force
npm i --legacy-peer-deps --verbose
npm run build
