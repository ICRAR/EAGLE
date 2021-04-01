# EAGLE Installation Guide

## Docker Images

### alpine based docker images

This is the preferred way to get EAGLE up and running both in an operational and in a development environment. It is based on an image from https://github.com/tiangolo/meinheld-gunicorn-flask-docker and packs meinheld, gunicorn, flask and EAGLE into a small, less than 200 MB image. When started it runs EAGLE as a Flask WSGI application served by multiple gunicorn tasks.

There are two versions of the docker image build procedures, one for deployment and one for local development.

#### Deployment Image

To build a deployment image:

    $ git clone https://github.com/ICRAR/EAGLE.git; cd EAGLE
    $ ./build_eagle.sh dep

This will build an image and tag it with the latest tag found on git. To start this image run:

    $ ./run_eagle.sh dep

The container will be started in the background and the script also attempts to open your preferred web-browser with a new tab. If that does not succeed open the page manually at:

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

## Non-docker installation

For debugging and testing in a local environment EAGLE has an internal web server, which is provided by the underlying Flask framework.

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

## Instructions about updating the image for eagle.icrar.org

*NOTE: THIS PROCEDURE WILL TEMPORARILY STOP THE PUBLIC EAGLE SERVER AND ALSO THE DALIUGE ENGINE AND TRANSLATOR! BEFORE ATTEMPTING THIS PLEASE MAKE SURE YOU HAVE TESTED THE TO BE DEPLOYED NEW IMAGE!!*

The released version of EAGLE is installed on AWS in an Elastic Container Service (ECS) environment in the us-east-1 region together with the rest of the DALiuGE system. The ECS cluster has the name *DALiuGE-EC2* and is running the task *DALiuGE_complete*. Updating the released EAGLE version involves four steps:

1. Upload a new EAGLE image to dockerhub
2. Create a new version of the existing ECS task definition
3. Stop the running task
4. Start the updated version of the task

### Upload new EAGLE image to DockerHub

After building the image you can push it using:

    docker push icrar/eagle:<version>

NOTE: Replace \<version\> with the correct tag.

### Create a new version of the existing ECS task definition

We are describing the procedure using the AWS web console here. Navigate to <https://console.aws.amazon.com/ecs/home?region=us-east-1#/taskDefinitions/DALiuGE_Complete>. If not already logged-in, you will first be re-directed to the login page. After authentication the Task Definition page will appear. 

- Click on the box left to the highest existing version of the DALiuGE_Complete task and then on *Create new revision*. This will bring you to a page titled *Create new revision of Task Definition*.
- Scroll down to the *Container Definitions* section and click on *eagle*. That will open a pop-out page where you can edit the container definition.
- The second item on the pop-up is a text box labeled *Image\**. Change the content of that text box to contain the image tag of the image you have pushed to DockerHub in the previous step and then click the *Update* box in the lower right corner. This will close the pop-out.
- Back on the task definition page, scroll all he way to the end and click the *Create* button.

### Stop the running task

- On the left menu click on *Clusters* and then *DALiuGE-EC2*
- On the next page click on the *Tasks* tab and then on *Stop All*
- Once the running task is stopped, click on *Run new Task*. That opens the Run Task page.
- Click on the radio button EC2 at the top and then on the *Run Task* button at the bottom of the page. That will bring you back to the Cluster page where you can see the status of the task. 
- The page updates at some point, but it is also possible to force an update earlier using the button with the two arrows at the right side of the Tasks tab. The startup usually only takes a couple of minutes and then the Status should be a green *RUNNING*.

### In case of issues

- If the status is not turning to RUNNING, some more details can be accessed by clicking on the link in the *Task* column of the table (the one with the hex number on the left). Usually that gives a quite good indication about what failed.
- If it can't be fixed immediately: START THE PREVIOUS VERSION OF THE TASK!!!
