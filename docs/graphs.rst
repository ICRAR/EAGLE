Graphs
======

A **graph** in EAGLE is a visual workflow — a network of :doc:`components <components>` connected by edges that defines how data flows between processing steps. Graphs are built in the EAGLE canvas and progress through four stages from initial design to execution on a cluster.

The Four Stages
---------------

.. list-table::
   :widths: 30 70
   :header-rows: 1

   * - Stage
     - Description
   * - **Logical Graph Template (LGT)**
     - The graph as built in EAGLE. Defines workflow structure with parameterised, reusable components. Can be shared and reused across different runs.
   * - **Logical Graph (LG)**
     - An LGT with all parameters filled in for a specific run. Represents a concrete workflow ready to be translated.
   * - **Physical Graph Template (PGT)**
     - Produced by the DALiuGE translator. Maps the LG onto a cluster topology using one of several available translation algorithms.
   * - **Physical Graph (PG)**
     - The PGT bound to specific hardware nodes and submitted for execution. Completely tied to a specific run; saved as part of the execution logs.

Building a Graph
----------------

Creating and Opening Graphs
""""""""""""""""""""""""""""

To create a new graph, use the **New** menu in the navbar and select **Create New Graph**. To open an existing graph from a repository, use the **Repositories** panel and click the ``.graph`` file you want to load.

To open one of the example graphs, use the **New** menu and browse the examples from the ``ICRAR/EAGLE-graph-repo`` repository.

Adding Components
"""""""""""""""""

Drag components from the palette panel on the left onto the canvas. Use the search box at the top of the palette panel to filter components by name.

Right-clicking on an empty area of the canvas opens a context menu with additional options, including inserting components from built-in categories and adding :doc:`Graph Visuals <annotating>`.

Selecting and Editing Components
"""""""""""""""""""""""""""""""""

Click a node to select it. Its properties appear in the inspector. From there you can:

- Edit application arguments and component parameters.
- View the component's description and add a comment.
- Add the node to a palette.

Hold ``Shift`` and click to select multiple nodes. Selected nodes can be moved together by dragging.

Connecting Components
"""""""""""""""""""""

Drag from an **output port** (right side of a node) to an **input port** (left side of another node) to create an edge. EAGLE validates the connection and displays a warning or error if it is problematic.

Dragging from a port into empty canvas space opens a component search menu — select a component to add it and automatically connect it.

.. figure:: _static/images/graph_with_edge_warning.png
   :width: 700px
   :align: center
   :alt: [screenshot: a graph with several nodes, some connected by edges, one edge showing a warning indicator]
   :figclass: align-center

   A graph with connected components. The orange indicator on one edge signals a warning.

Constructs
----------

Constructs are special components that wrap other components and define execution patterns such as parallelism and iteration. Components placed *inside* a construct (as children) inherit its execution behaviour.

To add components inside a construct, drag them onto the construct on the canvas. The construct highlights when it will accept the drop.

.. list-table::
   :widths: 25 75
   :header-rows: 1

   * - Construct
     - Behaviour
   * - **Scatter**
     - Distributes input data across *N* parallel copies of the enclosed components. Set ``Number of copies`` to control parallelism. Use a **Gather** to collect results.
   * - **Gather**
     - Collects results from parallel branches. Set ``Number of inputs`` to match the Scatter's copy count (or a divisor of it).
   * - **Loop**
     - Repeats the enclosed components for a fixed number of iterations, set via the ``Number of iterations`` parameter.
   * - **Group By**
     - Groups data items by a shared key before processing.
   * - **MKN**
     - Processes data in *M*-to-*K* batches across *N* workers.

.. figure:: _static/images/scatter_gather_construct.png
   :width: 600px
   :align: center
   :alt: [screenshot: a Scatter construct containing two app nodes and a memory node, connected to a Gather]
   :figclass: align-center

   A Scatter–Gather pattern distributing work across parallel branches.

Graph Configurations
--------------------

Graph configurations allow a single graph to carry multiple named sets of parameter values. This is useful for graphs that are reused across different observing runs or datasets where only a few parameters change each time.

To work with graph configurations:

1. Enable **Allow Modify Graph Configurations** in **Settings → Advanced Editing**.
2. Open the **Graph Configurations** panel from the navbar (``Ctrl+T`` to view all configs, ``Shift+T`` to view the active one).
3. Create a new configuration and set the values for the parameters you want to vary.
4. Switch the active configuration to apply a different set of values before translating.

Validating a Graph
------------------

Click the **Check Graph** button in the navbar to validate the current graph. EAGLE inspects the graph for:

- Invalid or problematic edges
- Unconnected required ports
- Empty text visuals
- Missing graph descriptions
- Any other schema or structural issues

Errors are shown in red; warnings in orange. The graph can still be translated with warnings, but errors must be resolved first (unless **Allow Invalid Edges** is enabled in Settings).

Saving and Loading
------------------

Save the current graph to GitHub with the **cloud** icon in the navbar, or locally with the **floppy disk** icon. Graphs are stored as ``.graph`` JSON files.

To copy a shareable URL to the current graph, right-click the canvas and select **Copy Graph URL**. Anyone with access to the same repository and EAGLE instance can open the graph directly from that URL.

Translating a Graph
-------------------

Translation converts a Logical Graph into a Physical Graph Template by mapping workflow components onto a cluster topology. To translate:

1. Ensure the graph is saved.
2. Click the **Translate** button in the navbar.
3. The Physical Graph Template opens in a new browser tab (or the current tab, depending on Settings).

The translator tab offers multiple algorithm choices under **Settings → UI Options → Translator Mode**. The **Expert** translator mode exposes additional algorithms for workflows with specific performance requirements.

.. figure:: _static/images/physical_graph_template_view.png
   :width: 600px
   :align: center
   :alt: [screenshot: the Physical Graph Template view showing components mapped to cluster nodes]
   :figclass: align-center

   A Physical Graph Template, showing the workflow mapped onto compute nodes.

Executing a Graph
-----------------

With a Physical Graph Template available, submit it for execution on a DALiuGE execution engine. The engine URL is configured under **Settings → External Services → Translator URL**.

During execution, EAGLE displays the graph and highlights component progress. Failures are shown immediately, making this view useful for debugging. Physical Graphs are completely tied to a specific execution run and are saved as part of the session logs.
