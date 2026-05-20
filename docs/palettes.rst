Palettes
========

A **palette** is a curated collection of :doc:`components <components>` packaged as a JSON file and loaded into EAGLE for use when building graphs. Palettes let you organise components by domain, project, or purpose, so that graph builders work with a focused, relevant set of building blocks rather than searching through every component ever created.

EAGLE includes a **Builtin Components** palette that is always available, containing standard components for common tasks. Additional palettes are loaded from GitHub or GitLab repositories.

.. figure:: _static/images/placeholder.png
   :width: 300px
   :align: center
   :alt: [screenshot: the palette panel showing a loaded palette with several components listed]
   :figclass: align-center

   A palette loaded in EAGLE, showing its components in the left panel.

Loading a Palette
-----------------

To load a palette from a remote repository:

1. Ensure your GitHub or GitLab access token is set under **Settings → External Services**.
2. Open the **Repositories** panel from the navbar.
3. Add the repository containing your palette (e.g. ``ICRAR/EAGLE-graph-repo``) if not already listed.
4. Browse to the ``.palette`` file and click it to load.

The palette's components immediately appear in the palette panel, ready to drag onto the canvas. Multiple palettes can be loaded at the same time.

Creating Palettes Automatically from Source Code
-------------------------------------------------

The recommended way to create a palette for a Python codebase is the `dlg_paletteGen <https://icrar.github.io/dlg_paletteGen/>`_ tool. It inspects source code and docstrings to automatically generate a ``.palette`` file with component descriptions, parameters, and port definitions — no manual JSON editing required.

This is particularly useful for large codebases and ensures that component descriptions stay in sync with the code.

Creating Palettes Manually in EAGLE
-------------------------------------

For fine-tuning components or building small palettes by hand, EAGLE's built-in palette editor can be used.

First, enable palette editing:

1. Open **Settings** (``O``).
2. Under **Advanced Editing**, enable **Allow Palette Editing**.

Building components in the graph editor:

1. From the **Builtin Components** or **Component Templates** palette, drag a suitable base component onto the canvas — for example, a **Python App** for a new Python component.
2. Select the component and edit its properties in the inspector panel:

   - Set the **Name** and **Description**.
   - Set the **Application Class** parameter to the fully-qualified Python import path.
   - Add, remove, or modify **ports** and **parameters** as needed (requires **Allow Component Editing** enabled in Settings).

3. Once the component is ready, click **Add Selected Node to Palette** in the inspector, or use **Add Graph Nodes to Palette** in the navbar to add all nodes at once.

.. figure:: _static/images/placeholder.png
   :width: 300px
   :align: center
   :alt: [screenshot: the "Add graph nodes to Palette" button in the navbar]
   :figclass: align-center

   The "Add graph nodes to Palette" button in the navbar.

Saving a Palette
----------------

To save to GitHub, click the **cloud** icon and choose the target repository and path. To save locally, click the **floppy disk** icon.

Palettes are saved as ``.palette`` JSON files and can be loaded back into any EAGLE instance. We recommend saving palettes to a dedicated repository, in a folder named after the palette's domain or purpose.

.. figure:: _static/images/placeholder.png
   :width: 500px
   :align: center
   :alt: [screenshot: a palette file open in the repository browser showing its component list]
   :figclass: align-center

   A saved palette viewed in the repository browser.
