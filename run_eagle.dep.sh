#!/bin/sh
# Build eagle and tag image with latest git tag
ln -sf prestart.dep.sh prestart.sh
echo "Running EAGLE deployment version in background"
docker-compose up --detach 