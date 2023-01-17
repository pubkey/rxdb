#!/bin/sh
set -e

rm -rf node_modules
rm -f rxdb-local.tgz
npm run preinstall
npm i --legacy-peer-deps --verbose
npm run build
