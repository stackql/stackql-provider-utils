#!/bin/bash

# Use first argument as provider root dir, default to current directory if not supplied
PROVIDER_REGISTRY_ROOT_DIR="${1:-$(pwd)}"

REG='{"url": "file://'${PROVIDER_REGISTRY_ROOT_DIR}'", "localDocRoot": "'${PROVIDER_REGISTRY_ROOT_DIR}'", "verifyConfig": {"nopVerify": true}}'

# start server if not running
echo "checking if server is running"
if [ -z "$(ps | grep stackql)" ]; then
    echo "starting server with registry: $REG"
    nohup ./stackql -v --registry="${REG}" --pgsrv.port=5444 srv &
    sleep 5
else
    echo "server is already running"
fi