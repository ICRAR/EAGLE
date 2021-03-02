#!/bin/sh
# Build eagle and tag image with latest git tag
ln -sf prestart.dev.sh prestart.sh
echo "Running EAGLE development version in foreground..."
docker-compose -f docker-compose.dev.yml up