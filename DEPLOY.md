# Deployment Instructions for eagle.icrar.org

*NOTE: THIS PROCEDURE WILL TEMPORARILY STOP THE PUBLIC EAGLE SERVER AND ALSO THE DALIUGE ENGINE AND TRANSLATOR! BEFORE ATTEMPTING THIS PLEASE MAKE SURE YOU HAVE TESTED THE TO BE DEPLOYED NEW IMAGE!!*

The released version of EAGLE is installed on AWS in an Elastic Container Service (ECS) environment in the us-east-1 region together with the rest of the DALiuGE system. The ECS cluster has the name *DALiuGE-EC2* and is running the task *DALiuGE_complete*. Updating the released EAGLE version involves four steps:

1. Upload a new EAGLE image to dockerhub
2. Create a new version of the existing ECS task definition
3. Stop the running task
4. Start the updated version of the task

## Upload new EAGLE image to DockerHub

After building the image you can push it using:

    docker push icrar/eagle:<version>

NOTE: Replace \<version\> with the correct tag.

## Create a new version of the existing ECS task definition

We are describing the procedure using the AWS web console here. Navigate to <https://console.aws.amazon.com/ecs/home?region=us-east-1#/taskDefinitions/DALiuGE_Complete>. If not already logged-in, you will first be re-directed to the login page. After authentication the Task Definition page will appear.

- Click on the box left to the highest existing version of the DALiuGE_Complete task and then on *Create new revision*. This will bring you to a page titled *Create new revision of Task Definition*.
- Scroll down to the *Container Definitions* section and click on *eagle*. That will open a pop-out page where you can edit the container definition.
- The second item on the pop-up is a text box labeled *Image\**. Change the content of that text box to contain the image tag of the image you have pushed to DockerHub in the previous step and then click the *Update* box in the lower right corner. This will close the pop-out.
- Back on the task definition page, scroll all he way to the end and click the *Create* button.

## Stop the running task

- On the left menu click on *Clusters* and then *DALiuGE-EC2*
- On the next page click on the *Tasks* tab and then on *Stop All*
- Once the running task is stopped, click on *Run new Task*. That opens the Run Task page.
- Click on the radio button EC2 at the top and then on the *Run Task* button at the bottom of the page. That will bring you back to the Cluster page where you can see the status of the task.
- The page updates at some point, but it is also possible to force an update earlier using the button with the two arrows at the right side of the Tasks tab. The startup usually only takes a couple of minutes and then the Status should be a green *RUNNING*.

## In case of issues

- If the status is not turning to RUNNING, some more details can be accessed by clicking on the link in the *Task* column of the table (the one with the hex number on the left). Usually that gives a quite good indication about what failed.
- If it can't be fixed immediately: START THE PREVIOUS VERSION OF THE TASK!!!
