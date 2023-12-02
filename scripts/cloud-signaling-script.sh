#!/bin/bash
set -e

cd /rxdb
nohup npm run cloud-signaling-server &
