#!/bin/sh
# Build the EAGLE development environment, allowing
# modifications on the host file system
echo "Building EAGLE development version"
ln -sf docker-compose.dev.yml docker-compose.yml
docker-compose -f docker-compose.dev.yml build
