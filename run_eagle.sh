case "$1" in
    "dep")
        VCS_TAG=`git describe --tags --abbrev=0|sed s/v//`
        echo "Running EAGLE deployment version in background..."
        docker run -d --name eagle-dep --rm -p 8888:80/tcp icrar/eagle:${VCS_TAG}
        python -m webbrowser http://localhost:8888
        exit 1;;
    "dev")
        ln -sf docker/prestart.dev.sh prestart.sh
        echo "Running EAGLE development version in foreground..."
        docker run --volume $PWD:/app --name eagle-dev --rm -p 8888:80/tcp icrar/eagle:dev
        exit 1;;
    *)
        echo "Usage run_eagle.sh <dep|dev>"
        exit 1;;
esac