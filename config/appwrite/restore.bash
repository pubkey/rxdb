#!/bin/bash

echo "RESTORE START"

source .env


echo "Waiting for MariaDB to be ready..."
until docker compose exec -T mariadb mysqladmin ping -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" --silent; do
    echo "MariaDB is still initializing..."
    sleep 3
done
echo "MariaDB ready. Restoring now."

echo "mysql creds"
echo $MYSQL_USER
echo $MYSQL_PASSWORD

docker compose exec -T mariadb sh -c "exec mysql -u'$MYSQL_USER' -p'$MYSQL_PASSWORD'" < ./backup/dump.sql

appwrite_volumes=(uploads cache config certificates functions)
for volume in ${appwrite_volumes[@]}; do
    if [ ! -f "./backup/$volume.tar" ]; then
        continue
    fi
    docker run --rm --volumes-from "$(docker compose ps -q appwrite)" -v $PWD/backup:/restore ubuntu:22.04 bash -c "cd /storage/$volume && tar xvf /restore/$volume.tar --strip 1"
done

if [ ! -f "./backup/builds.tar" ]; then
    exit 0
fi
docker run --rm --volumes-from "$(docker compose ps -q appwrite-worker-deletes)" -v $PWD/backup:/restore ubuntu:22.04 bash -c "cd /storage/builds && tar xvf /restore/builds.tar --strip 1"


# Verify if tables exist to confirm import success
table_check=$(docker compose exec -T mariadb mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -Nse "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='appwrite'")

if [[ "$table_check" -gt "0" ]]; then
    echo "Verification successful: Tables have been restored."
else
    echo "Verification failed: No tables found in database 'appwrite'. Exiting restore."
    exit 1
fi


echo "RESTORE DONE"
sleep 30
echo "RESTORE SLEEP DONE"
