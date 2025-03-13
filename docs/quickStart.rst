Quick Start Guide
=================

Here are some step-by-step instructions and videos to help you get up and running with EAGLE quickly. You can play around with the editor on our `public installation <https://eagle.icrar.org/?service=GitHub&repository=ICRAR/EAGLE-graph-repo&branch=master&path=examples&filename=HelloWorld-simple.graph>`_. The rest of this document provides a detailed description of the functionality and usage of EAGLE.

Setting Up Github
-----------------

EAGLE workflows are made up of :doc:`components <components>` that represent executable code or data that will be called when the graph is executed. To simplify the process of creating a workflow, multiple components may be collected together in a :doc:`palette <palettes>` designed for a certain domain, such as Radio Astronomy.

To load a palette from a GitHub repository, you first need to create a GitHub Personal Access Token. The steps required are demonstrated in this video.

.. raw:: html
    :file: _static/helloWorld_save_graph.html


Creating a new graph
--------------------

You can begin creating a new graph by using the "New" menu and selecting "Create New Graph". With a palette already loaded, the components may be added to the workspace. Things to keep in mind are:

* Components processed by each node on the cluster are set as parents, with components processed by GPUs on each node set as children.
* Selecting "Memory" for Data Components minimises the number of times data is moved around.

The following video provides a walkthrough for the creation of a specific graph, showing many of the features used to construct a workflow in EAGLE. A video providing a brief background overview of this workflow `may be viewed here <https://vimeo.com/458850054>`_, with a more detailed presentation `available here <https://vimeo.com/481476735>`_.

.. raw:: html
    :file: _static/video2.html

Saving a graph to gitHub
------------------------

To save a graph to GitHub, you will need to add a repository that you have permission to write to. You may need to create a new repository if you don't already have access to one.

Similarly to loading a palette, a GitHub Personal Access Token is required to save a graph to a repository. These steps are repeated in the following video, as well as adding a custom repository.

.. raw:: html
    :file: _static/video3.html

.. raw:: html
    :file: _static/load_videos.html
