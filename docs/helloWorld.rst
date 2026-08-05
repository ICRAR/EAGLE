Hello World Example
===================

This walkthrough is another form of our hello world tutorial, it is also present as a set of `guided UI tours <https://eagle.icrar.org/?tutorial=Quick%20Start>`_ within EAGLE.

Try the sample graph directly on the `public installation <https://eagle.icrar.org/?service=GitHub&repository=ICRAR/EAGLE-graph-repo&branch=master&path=examples&filename=HelloWorld-simple.graph>`_.

Graph Creation
--------------

Build the Hello World :doc:`Logical Graph Template <graphs>` by placing and connecting :doc:`components <components>`.
At this stage, you are defining workflow structure and parameters.


.. raw:: html
    :file: _static/helloWorld_creation_video.html

A logical graph is not executed directly.
It must be translated into a :doc:`Physical Graph Template <graphs>` before execution.

Saving a graph to GitHub
------------------------

Save to a repository you can write to.
Use a GitHub Personal Access Token for authentication.
See `instructions on GitHub <https://docs.github.com/en/enterprise-server@3.4/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token>`_ if you need help creating a token.

.. raw:: html
    :file: _static/helloWorld_save_graph.html

Translating a graph
-------------------

Translate the logical graph to generate a :doc:`Physical Graph Template <graphs>`.
This step applies scheduling and partitioning decisions required for execution.

.. raw:: html
    :file: _static/helloWorld_translate_graph.html

Executing a graph
-----------------

Execute the physical graph using your selected execution environment.
The video demonstrates one local Docker-based approach.

.. raw:: html
    :file: _static/helloWorld_execute_graph.html


