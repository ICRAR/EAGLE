# EAGLE Installation Guide

## Docker Images

### alpine based docker images

This is the preferred way to get EAGLE up and running both in an operational and in a development environment. It is based on an image from <https://github.com/tiangolo/meinheld-gunicorn-flask-docker> and packs meinheld, gunicorn, flask and EAGLE into a less than 400 MB docker image. When started, it runs EAGLE as a Flask WSGI application served by multiple gunicorn tasks.

There are two versions of the docker image build procedures, one for deployment and one for local development.

#### Deployment Image

To build a deployment image:

    git clone https://github.com/ICRAR/EAGLE.git; cd EAGLE
    ./build_eagle.sh dep

This will build an image and tag it with the latest tag found on git. To start this image run:

    ./run_eagle.sh dep

The container will be started in the background and the script also attempts to open your preferred web-browser in a new tab. If that does not succeed open the page manually at:

    http://localhost:8888

To stop and remove the deployment container run:

    stop_eagle.sh dep

#### Development Image

The development image maps the local host directory to the EAGLE instance installed inside the container and thus allows to modify things on-the-fly. To build a development image run:

    ./build_eagle.sh dev

To start this image run:

    ./run_eagle.sh dev

This will start the development image in forground and watch the typescript files for any changes. If changes are detected the compiler will translate the affected files. All changes in the static subdirectory will directly affect the deployed EAGLE instance. The only files which will not be reflected live in the docker image are the main eagleServer files under the eagleServer subdirectory. In order to push changes to those files or in cases where caching is preventing some changes to propagate through the stack calling

    docker/restart_gunicorn.sh

will likely help.

To stop the running container press CTRL+C in the terminal where the image was started (it is also possible to use './stop_eagle dev' from another command prompt).

## Non-docker installation

For debugging and testing in a local environment EAGLE has an internal web server, which is provided by the underlying Flask framework.

### Clone EAGLE repository

    git clone https://github.com/ICRAR/EAGLE  

### Install NPM

EAGLE is based on typescript and that and the supporting infrastructure needs to be installed first.

MacOSX users should download the latest NodeJS Long Term Support (LTS) installer from <https://nodejs.org>

Linux users should use apt

    sudo apt install npm

### Install typescript

This is a useful tool to install globally

    sudo npm install -g typescript

### Install dependencies using NPM

EAGLE depends on a number of packages. These are listed in package.json. To install all the dependencies:

    npm install

within the EAGLE directory.

### Compile the Typescript

Since Typescript is not interpretable by browsers, the source must be compiled/transcoded into native javascript. Run the Typescript compiler in the EAGLE directory.

    tsc

If you are actively developing EAGLE, it is recommended to use the Typescript compiler in "watcher mode", in which the tsc process persists, is notified of changes to the Typescript source, and automatically recompiles.

    tsc -w

### Install, create and activate virtualenv

Virtualenvs are standard in python3 and the recommended method
is to use pyenv. EAGLE does not impose any particular way of
using virtual environments, but strongly recommends to use a separate one for EAGLE. Please refer to the documentation of your virtual environment system on how to do this. EAGLE has only been tested with the plain virtualenv and the pyenv. With pyenv this would look like:

    pyenv virtualenv -p python3.6 eagle
    pyenv activate eagle

### Install EAGLE

    pip install .   

### Start Server

Simply start it using in the main directory:

$ eagleServer -t /tmp

## Tools

The repository also contains a tool to update old format graphs into new format files. It is IMPORTANT to run this "updateGraph" tool from within the tools subdirectory:

$ cd tools

then

$ ts-node updateGraph.ts <input_file> <output_file>
