Components
==========

Components are created by application developers and others to be used within an
EAGLE workflow. The components themselves exist outside of EAGLE, and may be
*Application Components* such as command line (shell) code, in-line Python and C/C++ dynamic libraries, and MPI code; or they can be *Data Components*, such as Memory, File, S3 and NGAS. Each of these provide different underlying functionality and integration.

To create a workflow, EAGLE only needs to access JSON representations of each component, which contain enough information to translate the workflow into a graph and then execute it correctly. These JSON files are referred to as *component descriptions*.

During the execution of a workflow, the executables and data wrapped by a component description have to be available to the execution engine; however, during the development of a Palette or translation into a Physical Graph Template, these don't need to be accessible by EAGLE.

In this documentation, a distinction isn't made between the component's external code and its description unless it is necessary for clarity.

.. figure:: _static/images/components.png
  :width: 400px
  :align: center
  :alt: An example of components in EAGLE
  :figclass: align-center

  An example of different components in EAGLE. Each component has inputs and outputs. They can be arranged as parents and children, and their inputs and outputs can be linked using *edges*.

Each component has a set of inputs and outputs, as well as exposed parameters. Executable code called by an Application Component may range from the most simple -- for example, just a single mathematical operation in Python or C, to a complete and complex workflow all by itself. The inner workings of the Application Component are not handled within EAGLE.

In combination, components allow the parallel reduction of many individual data sets.

Creating Components for Docker Images
-------------------------------------

The process for generating component descriptions for applications contained in Docker images is as follows:

Locate the image you wish to use on Docker Hub. For example, the ICRAR images are stored at https://hub.docker.com/u/icrar

Create a new graph and then create one Docker node from the Template Palette

.. figure:: _static/images/components/new_node.png
  :width: 210px
  :align: center
  :alt: A new graph containing a single Docker node
  :figclass: align-center

  A new graph containing a single Docker node

Click the node to modify its attributes:

* The "Image" field should contain the name of the image, for example, icrar/leap_cli
* The "Tag" field should contain the image tag, for example, 0.8.1.
* The "Digest" field should contain the hexadecimal hash of that version.
* The "Command"
* The "User"
* The "Ensure User And Switch"
* The "Remove Container"
* The "Additional Bindings"

.. figure:: _static/images/components/modify_parameters.png
  :width: 500px
  :align: center
  :alt: Modify the Docker node parameters with data from the Docker image
  :figclass: align-center

  Modify the Docker node parameters with data from the Docker image


Important Notes on Docker Images
--------------------------------

DALiuGE can only execute applications from Docker containers that satisfy the following requirements:

* pack a Bash shell (/bin/bash)
* pack /usr/bin/cat
* pack /etc/passwd
* It is also recommended to pack /usr/bin/ls.


Linking Components with Edges
-----------------------------

Within EAGLE, an output port from one component may be connected to the input port of another component via an *edge*. This is illustrated graphically by an arrow linking the two. An edge represents an event triggered by one component that in turn triggers other components to be processed.

It is only possible to link components that meet certain criteria, and some edges are inadvisable as they may affect performance. EAGLE provides error and warning messages when these edges are created.

.. figure:: _static/images/components2.png
  :width: 500px
  :align: center
  :alt: An example of components linked together with edges
  :figclass: align-center

  Here three components are linked together with edges.


.. figure:: _static/images/edgeWarning.png
  :width: 400px
  :align: center
  :alt: An example of a warning provided for an edge
  :figclass: align-center

.. figure:: _static/images/edgeError.png
  :width: 400px
  :align: center
  :alt: An example of an error provided for an edge
  :figclass: align-center

  A warning message (above) and an error message (below) caused by the creation of an edge that may affect performance or is invalid.

Environment Variables
---------------------
DALiuGE and, by extension, EAGLE support globally accessible environment variables in the form of ``EnvironmentVars`` components.
These components act as a globally available key-value store.
Other drops' parameters can reference parameters specified in this component. The translator and runtime engine handles filling these values in during workflow execution.
Importantly, each ``EnvironmentVars`` component in a graph needs a unique name to avoid variable aliasing.
Reference a store's variable in another component using the following syntax:
``$store_name.var_name``
For example, consider a store with the name 'environment_vars' and parameter 'scratch_dir: '/users/me/scratch''.
A second drop could reference this value in the parameter 'working_dir' by setting the parameter field to ``$environment_vars.scratch_dir``

Dynamic getting and setting of such variables are currently unsupported; they remain static variables, an editor accessible replacement for commonly used configuration files.