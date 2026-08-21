Templates and Graphs
====================

EAGLE workflows move through four stages.
You start with intent and end with an executable deployment.

.. raw:: html

    <img src="_static/images/templates_and_graphs.png" alt="Templates and Graphs" usemap="#graphs" style="display:block;margin-left:auto;margin-right:auto;">

    <map name="graphs">
    <area shape="rect" coords="0,0,500,134" alt="Logical Graph Template" href="#logical-graph-template" style="outline-style:none">
    <area shape="rect" coords="0,135,500,268" alt="Logical Graph" href="#logical-graph" style="outline-style:none">
    <area shape="rect" coords="0,269,500,402" alt="Physical Graph Template" href="#physical-graph-template" style="outline-style:none">
    <area shape="rect" coords="0,403,500,536" alt="Physical Graph" href="#physical-graph" style="outline-style:none">
    </map>

.. 
.. .. figure:: _static/images/templates_and_graphs.png
..   :width: 500px
..   :align: center
..   :alt: The progression of a workflow from Logical Graph Template to Physical Graph
..   :figclass: align-center
..
..   The progression of a workflow from Logical Graph Template to Physical Graph

.. _logical-graph-template:

Logical Graph Template
----------------------

A Logical Graph Template defines workflow structure.
It includes components, edges, and exposed parameters, but no run-specific values.
These exposed parameters can be defined as run-specific values as part of a :doc:`graph configuration <graphConfigurations>`, to simplify reuse of the template for different runs.

.. figure:: _static/images/components.png
  :width: 90%
  :align: center
  :alt: An example of a Logical Graph Template
  :figclass: align-center

  An example of a Logical Graph Template

Keep them stable and only add important parameters to the :doc:`graph configuration <graphConfigurations>`, which are likely to change between runs.

.. _logical-graph:

Logical Graph
-------------

A Logical Graph is a Logical Graph Template with an activated :doc:`graph configuration <graphConfigurations>`.
At this point the graph configuration has been filled in by the user with run-specific values and has been applied when it was sent to the DALiuGE translator.

.. figure:: _static/images/graph_configuration.png
  :width: 90%
  :align: center
  :alt: An example of a graph configuration for the HelloWorld-Universe graph
  :figclass: align-center

  An example of a graph configuration for the HelloWorld-Universe graph

.. _physical-graph-template:

Physical Graph Template
-----------------------

The `DALiuGE <https://daliuge.readthedocs.io>`_ translator first converts the Logical Graph into a Physical Graph Template.
This stage applies partitioning and scheduling decisions for target resources.

.. figure:: _static/images/physical_graph_template.png
  :width: 90%
  :align: center
  :alt: An example of a Physical Graph Template
  :figclass: align-center

  An example of a Physical Graph Template

Different translation algorithms are available.
Choose based on your constraints, such as runtime or resource usage.


.. _physical-graph:

Physical Graph
--------------

A Physical Graph is the deployed form where the partitions are mapped to compute nodes in a cluster.

.. figure:: _static/images/physical_graph.png
  :width: 90%
  :align: center
  :alt: An example of a Physical Graph
  :figclass: align-center

  An example of a Physical Graph


The Engine UI shows the graph as it is executing (or just a progress bar). 
Nodes on the graph are changing colors as the execution progresses. 
They are light-yellow before execution and yellow during execution. 
After execution application nodes turn green or red, depending on whether they had been successful or not.  
Memory data nodes are turning first grey and then black, once they had been garbage collected. 
All nodes following a failed application node are turning red. It is possible to click on the nodes and get information from the DALiuGE logging system. 
For file data nodes it is also possible to download the data.
