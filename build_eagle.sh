COMPOSE="docker-compose"

# Check if the user has a different docker compose setup
if ! command -v $COMPOSE
then
    COMPOSE="docker compose"
fi


case "$1" in
    "dep")
        export VCS_TAG=`git describe --tags --abbrev=0|sed s/v//`
        echo "Building EAGLE version ${VCS_TAG}"
        python updateVersion.py
        $COMPOSE -f ./docker/docker-compose.dep.yml build
        echo "Build finished!"
        exit 1 ;;
    "dev")
        export VCS_TAG=`git rev-parse --abbrev-ref HEAD`
        echo "Building EAGLE development version"
        python updateVersion.py
	$COMPOSE -f ./docker/docker-compose.dev.yml build
        echo "Build finished!"
        exit 1;;
    "slim")
        export VCS_TAG=`git describe --tags --abbrev=0|sed s/v//`
        echo "Building EAGLE slim version ${VCS_TAG}"
        python updateVersion.py
        $COMPOSE -f ./docker/docker-compose.dep.yml build
        echo "Build finished! Slimming the image now"
        echo "This requires to interact with the intermediate server."
        echo "Please open the EAGLE settings and put the gitHub and gitLab API keys in"
        echo "and then try to access the repositories. Else this will not work in the"
        echo "resulting slimmed image."
        echo ""
        echo ""
        echo ">>>>> docker-slim output <<<<<<<<<"
        docker run -it --rm -v /var/run/docker.sock:/var/run/docker.sock dslim/slim build --include-shell --include-path /usr/local/lib --include-path /usr/local/bin --http-probe=false icrar/eagle:${VCS_TAG} 
	;;
    *)
        echo "Usage: build_eagle.sh <dep|dev|slim>"
        exit 1;;
esac
