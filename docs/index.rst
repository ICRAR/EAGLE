EAGLE :sup:`pi`
===============

EAGLE is the visual editor for building DALiuGE workflows.
This guide helps you go from first launch to your first runnable graph.

.. figure:: _static/images/eagle_eagle.png
  :width: 400px
  :align: center
  :alt: An example of components in EAGLE
  :figclass: align-center


EAGLE is the UI for the `DALiuGE <https://daliuge.readthedocs.io>`_ workflow framework.
You design workflows as connected components, tune parameters, translate to a deployable graph, and then execute.

.. raw:: html
    :file: _static/intro_map.html

.. .. figure:: _static/images/full_process_diagram.png
..   :width: 600px
..   :align: center
..   :alt: Diagram of the full process from applications, to EAGLE workflows, to execution
..   :figclass: align-center
..
..   Diagram of the full process from applications, to EAGLE workflows, to execution

How EAGLE Works
===============

1. Build a workflow from :doc:`Components <components>`.
2. Organize components through :doc:`Palettes <palettes>`.
3. Create a :doc:`Logical Graph Template <graphs>` in the editor.
4. Set values to produce a Logical Graph.
5. Translate it into a Physical Graph Template.
6. Deploy and execute as a Physical Graph.

A component can wrap many payload types, such as shell commands, Python code, C/C++, MPI apps, or data handlers.
Components are defined in JSON descriptions so EAGLE can display, validate, and connect them.

.. toctree::
   :maxdepth: 2
   :caption: Getting started
   :hidden:

   Installation <installation>
   Quick Start <quickStart2>
   Hello World Example <helloWorld>
   Settings <settings>

.. toctree::
   :maxdepth: 2
   :caption: EAGLE Concepts
   :hidden:

   Components <components>
   Palettes <palettes>
   Templates and Graphs <graphs>
   Annotating Graphs <annotating>


.. Indices and tables
.. ==================
.. * :ref:`genindex`
.. * :ref:`modindex`
.. * :ref:`search`

