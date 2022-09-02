#!/bin/sh
set -e

# HowTo at:
# @link https://supabase.com/docs/guides/hosting/docker

# @link https://github.com/supabase/supabase/commits/master
COMMIT_HASH="cf283158e6ad4c4f99e6d900a61d0e844b7b3c52"

git clone --depth 1 https://github.com/supabase/supabase
cd ./supabase
git checkout $COMMIT_HASH
cd ./docker
cp .env.example .env


docker-compose build
