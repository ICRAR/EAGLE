case "$1" in
    "dep")
        VCS_TAG=`git describe --tags --abbrev=0|sed s/v//`
        echo "Running EAGLE deployment version in background..."
        docker run -d --name eagle-dep --rm -p 8888:80/tcp icrar/eagle:${VCS_TAG}
        sleep 5
        python -m webbrowser http://localhost:8888
        exit 1;;
    "rel")
        VCS_TAG=`git describe --tags --abbrev=0|sed s/v//`
        echo "Running EAGLE release version in background..."
        docker run -d --name eagle-dep --rm -p 6080:80/tcp icrar/eagle:${VCS_TAG}
        exit 1;;
    "dev")
        export VCS_TAG=`git rev-parse --abbrev-ref HEAD`
        ln -sf docker/prestart.dev.sh prestart.sh
        echo "Running EAGLE development version in foreground..."
        docker run --volume $PWD:/app --name eagle-dev --rm -p 8888:80/tcp icrar/eagle:${VCS_TAG}
        exit 1;;
    *)
        echo "Usage run_eagle.sh <dep|dev|rel>"
        exit 1;;
esac