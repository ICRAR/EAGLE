case "$1" in
    "dep")
        export VCS_TAG=`git describe --tags --abbrev=0|sed s/v//`
        echo "Building EAGLE version ${VCS_TAG}"
        python updateVersion.py
        docker-compose -f ./docker/docker-compose.dep.yml build
        echo "Build finished!"
        exit 1 ;;
    "dev")
        export VCS_TAG=`git rev-parse --abbrev-ref HEAD`
        echo "Building EAGLE development version"
        docker-compose -f ./docker/docker-compose.dev.yml build
        echo "Build finished!"
        exit 1;;
    *)
        echo "Usage: build_eagle.sh <dep|dev>"
        exit 1;;
esac
