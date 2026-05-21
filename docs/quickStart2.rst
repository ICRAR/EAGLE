Quick Start
===========

This page introduces the EAGLE interface and walks through the core workflow: loading a palette, building a graph, and saving it. You can follow along on the `public EAGLE instance <https://eagle.icrar.org>`_ without installing anything.

The Interface
-------------

.. figure:: _static/images/interface_overview.png
   :width: 700px
   :align: center
   :alt: [screenshot: the EAGLE interface with labels pointing to the canvas, palette panel, inspector, right panel, editor panel, and navbar]
   :figclass: align-center

   The EAGLE interface. Canvas (centre), palette panel (left), inspector (floating card), right panel (right), editor panel (bottom), navbar (top).

EAGLE has six main areas:

- **Canvas** — the main workspace where you drag, arrange, and connect components to build a graph.
- **Palette panel** (left) — lists components from all loaded palettes, searchable by name. Drag a component onto the canvas to add it to the graph.
- **Inspector** (floating card, bottom-left of the canvas) — always visible. Shows graph-level information when nothing is selected. When a node, edge, or group of objects is selected it shows their properties and available actions, including quick access to key parameter values.
- **Right panel** (right) — a collapsible panel with three tabs: **Repositories** (browse and load graphs, palettes, and configs from GitHub/GitLab), **Hierarchy** (a tree view of the graph structure), and **Translation** (translation options).
- **Editor panel** (bottom) — a collapsible panel with four tabs: **Node Parameter Table** (full parameter list for the selected node), **Config Parameter Table** (graph-level key attributes), **Graph Configurations** (manage named configurations), and **Issues** (graph errors and warnings).
- **Navbar** (top) — access to file operations, graph validation, translation, settings, and repositories.

Connecting to GitHub
--------------------

EAGLE loads palettes and saves graphs to and from GitHub and GitLab repositories. Before doing either you need to provide an access token.

1. Open **Settings** (cog icon in the navbar, or press ``O``).
2. Go to the **External Services** tab.
3. Paste your **GitHub Access Token** into the corresponding field.

.. note::
   To generate a token, follow the `GitHub instructions <https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token>`_. The token needs at least ``repo`` scope to read and write graph files.

The following video demonstrates generating a token and connecting to a repository:

.. raw:: html
    :file: _static/video1.html

Loading a Palette
-----------------

Components are grouped into *palettes* — curated collections for a specific domain or project. To load one:

1. Open the **Repositories** panel from the navbar.
2. Add a repository (e.g. ``ICRAR/EAGLE-graph-repo``) and browse to a palette file (``*.palette``).
3. Click the palette to load it. Its components appear in the palette panel on the left.

EAGLE also includes a built-in **Builtin Components** palette that is always available, containing standard components for common tasks.

Creating a Graph
----------------

1. From the **New** menu, select **Create New Graph**.
2. Drag components from the palette panel onto the canvas.
3. Connect components by dragging from an **output port** (right side of a node) to an **input port** (left side of another node). EAGLE will indicate whether the connection is valid.
4. Select any component to view and edit its parameters in the inspector.

.. figure:: _static/images/simple_graph.png
   :width: 700px
   :align: center
   :alt: [screenshot: a small graph with three connected nodes on the canvas]
   :figclass: align-center

   A simple graph with three connected components.

The following video provides a walkthrough for building a graph:

.. raw:: html
    :file: _static/video2.html

Validating a Graph
------------------

Click the **Check Graph** button (tick icon) in the navbar at any time to validate the current graph. EAGLE checks for issues such as unconnected ports, missing descriptions, invalid edges, and empty text visuals. Errors and warnings are listed in the panel that opens.

Saving a Graph
--------------

To save to GitHub, click the **cloud** icon in the navbar, choose the target repository and path, and confirm. EAGLE will commit the graph as a ``.graph`` JSON file.

To save locally, click the **floppy disk** icon instead.

.. raw:: html
    :file: _static/video3.html

.. raw:: html
    :file: _static/load_videos.html
