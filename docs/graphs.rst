Templates and Graphs
====================

EAGLE workflows move through four stages.
You start with intent and end with an executable deployment.

.. raw:: html
    :file: _static/graphs_map.html

.. 
.. .. figure:: _static/images/templates_and_graphs.png
..   :width: 500px
..   :align: center
..   :alt: The progression of a workflow from Logical Graph Template to Physical Graph
..   :figclass: align-center
..
..   The progression of a workflow from Logical Graph Template to Physical Graph

Logical Graph Template
----------------------

A Logical Graph Template defines workflow structure.
It includes components, edges, and exposed parameters, but no run-specific values.
These exposed parameters can be defined as run-specific values as part of a ``graph configuration``, to simplify reuse of the template for different runs.

.. figure:: _static/images/components.png
  :width: 90%
  :align: center
  :alt: An example of a Logical Graph Template
  :figclass: align-center

  An example of a Logical Graph Template

Keep them stable and only add important parameters to the graph configuration, which are likely to change between runs.

Logical Graph
-------------

A Logical Graph is a Logical Graph Template with an activated ``graph configuration``, when it is being sent to the DALiuGE translator.

.. figure:: _static/images/graph_configuration.png
  :width: 90%
  :align: center
  :alt: An example of a graph configuration for the HelloWorld-Universe graph
  :figclass: align-center

  An example of a graph configuration for the HelloWorld-Universe graph

Physical Graph Template
-----------------------

The `DALiuGE <https://daliuge.readthedocs.io>`_ translator first converts the Logical Graph into a Physical Graph Template.
This stage applies partitioning and scheduling decisions for target resources.

.. figure:: _static/images/physical_graph_template.png
  :width: 500px
  :align: center
  :alt: An example of a Physical Graph Template
  :figclass: align-center

  An example of a Physical Graph Template

Different translation algorithms are available.
Choose based on your constraints, such as runtime or resource usage.


Physical Graph
--------------

A Physical Graph is the deployed form where the partitions are mapped to compute nodes in a cluster.
The DALiuGE Engine UI shows execution progress and failures for debugging and development.
Execution records are stored with run logs.
