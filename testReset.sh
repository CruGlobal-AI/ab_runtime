#!/bin/bash
STACK=${1}
STACK=${STACK:=test_ab}

# Image registry for AppBuilder images (CruGlobal-AI fork default)
AB_IMAGE_REGISTRY="${AB_IMAGE_REGISTRY:-ghcr.io/cruglobal-ai}"

ID_Service=`docker ps | grep ${STACK}_db | awk '{ print $1 }'`
if [ -z "$ID_Service" ]
then
	echo ""
	echo "couldn't find process matching '${STACK}_db' "
	echo ""
	echo "current processes :"
	docker ps
	echo ""
else
	docker exec $ID_Service bash reset.sh
	docker run \
        --env-file .env\
        --network=${STACK}_default \
        ${AB_IMAGE_REGISTRY}/ab-migration-manager:master node app.js
fi
