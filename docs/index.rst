EAGLE :sup:`π`
==============

**EAGLE** (Editor for the Astronomical Graph Language Environment) is the visual workflow editor for the `DALiuGE <https://daliuge.readthedocs.io>`_ execution framework. It provides a drag-and-drop interface for composing data-processing workflows as graphs of reusable components, which can then be translated and executed on HPC facilities.

.. raw:: html
    :file: _static/intro_map.html

No installation is required to try EAGLE — a public instance is available at `eagle.icrar.org <https://eagle.icrar.org>`_.

The Workflow Pipeline
---------------------

An EAGLE workflow moves through four stages from design to execution:

.. list-table::
   :widths: 30 70
   :header-rows: 0

   * - :doc:`Logical Graph Template <graphs>` (LGT)
     - A reusable, parameterised graph created in EAGLE. Defines the structure of a workflow without fixing execution details.
   * - :doc:`Logical Graph <graphs>` (LG)
     - An LGT with all parameters set for a specific run. Ready for translation.
   * - :doc:`Physical Graph Template <graphs>` (PGT)
     - Produced by the DALiuGE translator. Maps the LG onto a cluster topology using one of several available algorithms.
   * - :doc:`Physical Graph <graphs>` (PG)
     - The PGT bound to specific hardware nodes and submitted for execution.

.. toctree::
   :maxdepth: 2
   :caption: Getting Started
   :hidden:

   Installation <installation>
   Quick Start <quickStart2>
   Hello World Example <helloWorld>

.. toctree::
   :maxdepth: 2
   :caption: Working with EAGLE
   :hidden:

   Components <components>
   Palettes <palettes>
   Graphs <graphs>
   Annotating Graphs <annotating>

.. toctree::
   :maxdepth: 2
   :caption: Reference
   :hidden:

   Settings <settings>

