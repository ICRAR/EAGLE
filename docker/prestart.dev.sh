# For the development environment we built everything on
# the current host directory and mount it inside the container.
# Thus the installation is done after the container actually
# started, rather than during the creation of the image.
echo ""
echo ">>>>>"
echo "This is the development runtime for EAGLE"
echo "we first need to install the environemnt inside the docker container"
echo "This will take a bit..."
echo "<<<<<"
echo ""
pip install -e .
python updateVersion.py
#npm install --production-only 
npm install
# compile the typescript code
tsc
echo "Install complete. Starting the server..."
export APP_MODULE="eagleServer.eagleServer:app"
export WORKERS_PER_CORE="1"
export LOG_LEVEL="debug"
# start tsc and keep watching for changes
tsc -w &

