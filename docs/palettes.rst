Palettes
========

A palette is a curated collection of :doc:`components <components>`.
It helps users find relevant nodes quickly for a domain, project, or workflow.

.. figure:: _static/images/palette.png
  :width: 90%
  :align: center
  :alt: An example of a palette in EAGLE
  :figclass: align-center

  An example of a palette with a focused set of components for a single workflow

Good palettes are focused.
Smaller, purpose-built palettes are usually easier to use than one large catch-all palette.

There are two main ways to create palettes: automatic generation and manual authoring.


Creating Palettes Automatically from Source Code
------------------------------------------------

Use the standalone `palette generation tool <https://icrar.github.io/dlg_paletteGen/>`_ to create component descriptions from source code.
This is the fastest option when onboarding existing codebases.

Creating Palettes within EAGLE
------------------------------

You can build palettes directly in EAGLE.

1. Change Ui Mode to ``Component`` in settings.
2. Right click a component in the ``Component Templates`` Palette or another existing palette.
3. Select ``Add to another palette`` and enter a name under custom to create a new one.
4. The Component can be edited under the new palette, or you can add more components to the palette by repeating the process.
5. You may also add components from the graph using right click menus with ``Add Selected Node to Palette`` or many with the ``Add Graph Nodes to Palette`` in the navbar.

Manual palette generation is best for refinement and small curated palettes.

.. figure:: _static/images/components/navbar_button.png
  :width: 90%
  :align: center
  :alt: Click the "Add graph nodes to Palette" button in the navbar
  :figclass: align-center

  Click the "Add graph nodes to Palette" button in the navbar

Save palettes locally or to Git repositories.
For collaboration, store them in a dedicated GitHub or GitLab repository.

  The new palette containing a Docker component description
