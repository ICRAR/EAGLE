#!/bin/sh
# Build eagle and tag image with latest git tag
export VCS_TAG=`git describe --tags --abbrev=0|sed s/v//`
echo "Building EAGLE version ${VCS_TAG}"
docker-compose -f docker-compose.dep.yml build
