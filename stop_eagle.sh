case "$1" in
    "dep")
        docker stop eagle-dep
        exit 1;;
   "dev")
        docker stop eagle-dev
        rm prestart.sh
        exit 1;;
    "slim")
        docker stop eagle-slim
        exit 1;;
    *)
        echo "Usage stop_eagle.sh <dep|dev|slim>"
        exit 1;;
esac
