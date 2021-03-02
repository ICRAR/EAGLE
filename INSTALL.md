# EAGLE Installation Guide

## Docker Images

### alpine based docker images

This is the preferred way to get EAGLE up and running both in an operational and in a development environment. It is based on an an image from https://github.com/tiangolo/meinheld-gunicorn-flask-docker and packs meinheld, gunicorn, flask and EAGLE into a small, less than 200 MB image. When started it runs EAGLE as a Flask WSGI application served by multiple gunicorn tasks.

There are two versions of the docker image build procedures, one for deployment and one for local development.

#### Deployment Image

To build a deployment image:

    $ git clone https://github.com/ICRAR/EAGLE.git; cd EAGLE
    $ ./build_eagle.dep.sh

This will build an image and tag it with the latest tag found on git. To start this image run:

    $ ./run_eagle.dep.sh

The container will be started in the background. To us it locally, navigate to the EAGLE access point and start creating workflows:

    http://localhost:8888

To stop and remove the deployment container run:

    $ ./stop_eagle.dep.sh

#### Development Image

The development image maps the local host directory to the EAGLE instance installed inside the container and thus allows to modify things on-the-fly. To build a development image run:

    $ ./build_eagle.dev.sh

To start this image run:

    $ ./start_eagle.dev.sh

This will start the development image in forground and watch the typescript files for any changes. If changes are detected the compiler will translate the affected files. All changes in the static subdirectory will directly affect the deployed EAGLE instance. The only files which will not be reflected live in the docker image are the main eagleServer files under the eagleServer subdirectory. In order to make this possible the actual installation all the EAGLE system is carried out during the start of the container and not during the build of the image.

To stop the running container press CTRL+C in the terminal where the image was started.

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

## Full Installation

## Fabric Installations
Fabric is a sophisticated ssh client library. It is used for EAGLE's more complex installations. In order to be able to use it you need to install the fabric module into your python environment first by executing:

    $ pip install https://github.com/ICRAR/fabfileTemplate

The installation procedure also allows installing EAGLE on an AWS instance and thus the boto library is required in your local environment as well:

    $ pip install boto   # optional

### Centos7 based docker image

NOTE: This is deprecated. The above methods should be used instead.

The fabric script also allows to create a docker image. In order to enable that the virtualenv in addition needs the python docker module.

    $ pip install docker

then

    $ fab hl.docker_image

will generate the image based on Centos7. The server can be started using:

    $ docker run -ti -p 8888:8888 icrar/eagle:latest /home/eagle/eagle_rt/bin/eagleServer

### Operational Installation
NOTE: This requires root or sudo on the remote host, since it is installing
required system packages. Only the main Linux distributions are supported.

    $ fab hl.operations_deploy -u \<username\> -H \<hostname\> [-i <path_to_ssh_keyfile>]

### AWS Installation
This installation task starts a new instance on AWS and thus requires an AWS
account and the setup of AWS credentials. Once that is done you can running

    $ fab hl.aws_deploy

The installation will use an AWS micro instance and install all the required software, launch EAGLE under uwsgi and nginx and you can then connect using the URL http://\<ec2-instance-name\>/

### Docker Image
The fabric script also allows to create a docker image. In order to enable that the virtualenv in addition needs the python docker module.

$ pip install docker

then

$ fab hl.docker_image

will generate the image based on Centos7.
The server can be started using:

$ docker run -ti -p 2222:22 -p 8888:8888 icrar/eagle:latest /home/eagle/eagle_rt/bin/eagleServer

In future versions the docker image will be based on a full NGINX/UWSGI server and will thus be deployment ready.

## Tools
The repository also contains a tool to update old format graphs into new format files. It is IMPORTANT to run this "updateGraph" tool from within the tools subdirectory:

$ cd tools

then

$ ts-node updateGraph.ts <input_file> <output_file>
