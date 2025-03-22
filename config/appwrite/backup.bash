#!/bin/bash

mkdir -p backup

docker compose exec mariadb sh -c 'exec mysqldump --all-databases --add-drop-database -u"$MYSQL_USER" -p"$MYSQL_PASSWORD"' > ./backup/dump.sql

appwrite_volumes=(uploads cache config certificates functions)
for volume in ${appwrite_volumes[@]}; do
    mkdir -p backup && docker run --rm --volumes-from "$(docker compose ps -q appwrite)" -v $PWD/backup:/backup ubuntu bash -c "cd /storage/$volume && tar cvf /backup/$volume.tar ."
done

docker run --rm --volumes-from "$(docker compose ps -q appwrite-worker-deletes)" -v $PWD/backup:/backup ubuntu bash -c "cd /storage/builds && tar cvf /backup/builds.tar ."

cp docker-compose.yml backup
cp .env backup
if [ -f docker-compose.override.yml ]; then
    cp docker-compose.override.yml backup
fi
