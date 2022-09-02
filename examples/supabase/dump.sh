#!/bin/sh
set -e

rm -f dump.sql

export PGPASSWORD="your-super-secret-and-long-postgres-password"
pg_dump postgres -h localhost -U postgres -F c > dump.sql
