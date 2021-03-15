# EAGLE Installation Guide

## Docker Images

### alpine based docker images

This is the preferred way to get EAGLE up and running both in an operational and in a development environment. It is based on an an image from https://github.com/tiangolo/meinheld-gunicorn-flask-docker and packs meinheld, gunicorn, flask and EAGLE into a small, less than 200 MB image. When started it runs EAGLE as a Flask WSGI application served by multiple gunicorn tasks.

There are two versions of the docker image build procedures, one for deployment and one for local development.

#### Deployment Image

To build a deployment image:

    $ git clone https://github.com/ICRAR/EAGLE.git; cd EAGLE
    $ ./build_eagle.sh dep

This will build an image and tag it with the latest tag found on git. To start this image run:

    $ ./run_eagle.sh dep

The container will be started in the background. To us it locally, navigate to the EAGLE access point and start creating workflows:

    http://localhost:8888

To stop and remove the deployment container run:

    $ stop_eagle.sh dep

#### Development Image

The development image maps the local host directory to the EAGLE instance installed inside the container and thus allows to modify things on-the-fly. To build a development image run:

    $ ./build_eagle.sh dev

To start this image run:

    $ ./run_eagle.sh dev

This will start the development image in forground and watch the typescript files for any changes. If changes are detected the compiler will translate the affected files. All changes in the static subdirectory will directly affect the deployed EAGLE instance. The only files which will not be reflected live in the docker image are the main eagleServer files under the eagleServer subdirectory. In order to make this possible the actual installation all the EAGLE system is carried out during the start of the container and not during the build of the image.

To stop the running container press CTRL+C in the terminal where the image was started (it is also possible to use './stop_eagle dev' from another command prompt).

Sometimes caching is preventing some changes to propagate through the stack in that case calling

    $ docker/restart_gunicorn.sh

might help.

## Debugging and Testing

For debugging and testing EAGLE has an internal web server, which is provided
by the underlying Flask framework.

### Clone EAGLE repository

    $ git clone https://github.com/ICRAR/EAGLE  

### Install NPM

EAGLE is based on typescript and that and the supporting infrastructure needs to be installed first.

MacOSX users should download the latest NodeJS Long Term Support (LTS) installer from https://nodejs.org

Linux users should use apt

    $ sudo apt install npm

### Install typescript

This is a useful tool to install globally

    $ sudo npm install -g typescript

### Install, create and activate virtualenv

Virtualenvs are standard in python3 and the recommended method
is to use pyenv. EAGLE does not impose any particular way of
using virtual environments, but strongly recommends to use a separate one for EAGLE. Please refer to the documentation of your virtual environment system on how to do this. EAGLE has only been tested with the plain virtualenv and the pyenv. With pyenv this would look like:

    $ pyenv virtualenv -p python3.6 eagle
    $ pyenv activate eagle

### Install EAGLE

    $ pip install .   

### Start Server`

Simply start it using in the main directory:

$ eagleServer -t /tmp
## Tools
The repository also contains a tool to update old format graphs into new format files. It is IMPORTANT to run this "updateGraph" tool from within the tools subdirectory:

$ cd tools

then

$ ts-node updateGraph.ts <input_file> <output_file>
