#!/usr/bin/env bash
set -e

npm run build
npm run check-types
npm run lint
npm run test:fast:memory
