#!/bin/sh
set -e

export PGPASSWORD="your-super-secret-and-long-postgres-password"

# postgres might not be up already
# so we have to retry
n=0
until [ "$n" -ge 20 ]
do
   pg_restore -h localhost -d postgres -U postgres dump.sql && break
   n=$((n+1)) 
   echo "failed to import, will try again in 5 seconds"
   sleep 5
done

echo "Successfully imported database dump"
