Hello World Examples
====================

Graph Creation
--------------

This video provides detailed instructions for constructing the "Hello World" :doc:`Logical Graph Template <graphs>`. In most documentation, and the EAGLE interface, this is referred to as a graph. It is a visual depiction of the relationships between different :doc:`components <components>` integrated into a workflow.

.. raw:: html
    :file: _static/helloWorld_creation_video.html

The graph cannot itself be executed on any hardware; it must first be :doc:`translated <translation>` into a :doc:`Physical Graph Template <graphs>` via an algorithm that will optimise it for efficiency and parallel processing. This translated graph can then be entered into the queue on the chosen facility for :doc:`execution <execution>`.

Saving a graph to GitHub
------------------------

To save a graph to GitHub, you will need to add a repository that you have permission to write to. You may need to create a new repository if you don't already have access to one.

A GitHub Personal Access Token is required to save a graph to a repository. These steps are demonstrated in the following video, as well as adding a custom repository.

.. raw:: html
    :file: _static/helloWorld_save_graph.html

Translating a graph
-------------------

The graph created in EAGLE needs to be :doc:`translated <translation>` into a :doc:`Physical Graph Template <graphs>` before it can be executed. This video will step you through the process of translating a simple Hello World graph.

.. raw:: html
    :file: _static/helloWorld_translate_graph.html

|

Quick Start Guides
==================

Here are some additional step-by-step instructions and videos to help you get up and running with EAGLE quickly.

Loading a Palette
-----------------

EAGLE workflows are made up of :doc:`components <components>` that represent executable code or data that will be called when the graph is executed. To simplify the process of creating a workflow, multiple components may be collected together in a :doc:`palette <palettes>` designed for a certain domain, such as Radio Astronomy.

To load a palette from a GitHub repository, you first need to create a GitHub Personal Access Token. The steps required are demonstrated in this video.

.. raw:: html
    :file: _static/video1.html


.. raw:: html
    :file: _static/load_videos.html
