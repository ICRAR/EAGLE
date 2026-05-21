Hello World Example
===================

This page walks through the complete lifecycle of a simple EAGLE workflow — from building a graph, to saving it, to translating and executing it. The example used is the **Hello World** graph, which is included in the `EAGLE graph repository <https://eagle.icrar.org/?service=GitHub&repository=ICRAR/EAGLE-graph-repo&branch=master&path=examples&filename=HelloWorld-simple.graph>`_ and can be opened directly in the public instance.

Building the Graph
------------------

The Hello World graph uses two components from the Builtin Components palette: a ``String2JSON`` node that produces a greeting string, and a ``HelloWorldApp`` node that consumes it and writes output to a ``File`` data component.

The following video walks through building this graph from scratch:

.. raw:: html
    :file: _static/helloWorld_creation_video.html

Key points from the video:

- Drag components from the palette panel onto the canvas.
- Connect the output port of ``String2JSON`` to the input port of ``HelloWorldApp`` by dragging between ports.
- The ``File`` data component receives the output of ``HelloWorldApp`` — select it and set a filename in the inspector, or leave it blank and DALiuGE will generate a unique name at runtime.
- Select any node and edit its parameters in the inspector. For ``HelloWorldApp``, the ``Greet`` argument controls what is printed.

Saving to GitHub
----------------

Before the graph can be translated or shared, save it to a GitHub repository. A Personal Access Token with ``repo`` scope is required — follow the `GitHub instructions <https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token>`_ to generate one, then add it under **Settings → External Services**.

.. raw:: html
    :file: _static/helloWorld_save_graph.html

Translating the Graph
---------------------

A Logical Graph Template cannot be executed directly. It must first be translated into a Physical Graph Template by the DALiuGE translation engine, which maps the workflow onto a cluster topology.

To translate, click the **Translate** button in the navbar. The translated graph opens in a new browser tab showing the Physical Graph Template.

.. raw:: html
    :file: _static/helloWorld_translate_graph.html

Executing the Graph
-------------------

With a Physical Graph Template available, it can be submitted for execution. The video below shows one way to do this using a local DALiuGE execution engine running in Docker.

.. raw:: html
    :file: _static/helloWorld_execute_graph.html

During execution, EAGLE displays the graph and highlights the progress of each component. Failures are shown immediately, making this view useful for debugging during development.

Next Steps
----------

- Try modifying the ``Greet`` argument on ``HelloWorldApp`` to print a different message.
- Add a ``Scatter`` construct around ``HelloWorldApp`` to run it in parallel across multiple inputs — see :doc:`Graphs <graphs>` for details on constructs.
- Explore the full Hello World with parallelism example: `HelloWorld-Universe.graph <https://eagle.icrar.org/?service=GitHub&repository=ICRAR/EAGLE-graph-repo&branch=master&path=examples&filename=HelloWorld-Universe.graph>`_.


