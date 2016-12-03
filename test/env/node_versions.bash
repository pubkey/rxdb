

SCRIPT="`readlink -f -- $0`"
SCRIPTPATH="`dirname $SCRIPT`"
echo $SCRIPTPATH




docker rm -f node6.9.1
docker run -it --name node6.9.1 \
    -v ${SCRIPTPATH}/../:/src \
    node:6.9.1 /bin/bash /src/test_env/entrypoint.bash && echo ok || exit 1;
echo "#################################"
echo "#################################"
echo "#################################"
echo "#################################"
echo "node:6.9.1 works !"
echo "#################################"
echo "#################################"
echo "#################################"
echo "#################################"


docker rm -f node5.12.0
docker run -it --name node5.12.0 \
    -v ${SCRIPTPATH}/../:/src \
    node:5.12.0 /bin/bash /src/test_env/entrypoint.bash && echo ok || exit 1;
echo "#################################"
echo "#################################"
echo "#################################"
echo "#################################"
echo "node:5.12.0 works !"
echo "#################################"
echo "#################################"
echo "#################################"
echo "#################################"


docker rm -f node4.6.1
docker run -it --name node4.6.1 \
    -v ${SCRIPTPATH}/../:/src \
    node:4.6.1 /bin/bash /src/test_env/entrypoint.bash && echo ok || exit 1;

echo "#################################"
echo "#################################"
echo "#################################"
echo "#################################"
echo "node:4.6.1 works !"
echo "#################################"
echo "#################################"
echo "#################################"
echo "#################################"


docker rm -f node7.0.0
docker run -it --name node7.0.0 \
    -v ${SCRIPTPATH}/../:/src \
    node:7.0.0 /bin/bash /src/test_env/entrypoint.bash && echo ok || exit 1;

echo "#################################"
echo "#################################"
echo "#################################"
echo "#################################"
echo "node:7.0.0 works !"
echo "#################################"
echo "#################################"
echo "#################################"
echo "#################################"
