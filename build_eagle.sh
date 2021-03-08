case "$1" in
    "dev")
        echo "Building development image..."
        echo "Building EAGLE development version"
        docker-compose -f ./docker/docker-compose.dev.yml build
        exit 1;;
    "dep")
        echo "Building deployment image..."
        export VCS_TAG=`git describe --tags --abbrev=0|sed s/v//`
        echo "Building EAGLE version ${VCS_TAG}"
        docker-compose -f ./docker/docker-compose.dep.yml build
        exit 1 ;;
    *)
        echo "Usage: build_eagle.sh <dep|dev>"
        exit 1;;
esac
