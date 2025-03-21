#!/bin/bash

docker compose exec -T mariadb sh -c 'exec mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD"' < ./backup/dump.sql

appwrite_volumes=(uploads cache config certificates functions)
for volume in ${appwrite_volumes[@]}; do
    if [ ! -f "./backup/$volume.tar" ]; then
        continue
    fi
    docker run --rm --volumes-from "$(docker compose ps -q appwrite)" -v $PWD/backup:/restore ubuntu bash -c "cd /storage/$volume && tar xvf /restore/$volume.tar --strip 1"
done

if [ ! -f "./backup/builds.tar" ]; then
    exit 0
fi
docker run --rm --volumes-from "$(docker compose ps -q appwrite-worker-deletes)" -v $PWD/backup:/restore ubuntu bash -c "cd /storage/builds && tar xvf /restore/builds.tar --strip 1"
