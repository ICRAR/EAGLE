Palettes
========

A palette is a collection of :doc:`Components <components>` defined for a
specific domain or sub-domain -- for instance for radio astronomy, or for a
specific workflow used within radio astronomy. They are a convenient way to
provide a focused set of components and make them available within your workflow
development environment.

.. figure:: _static/images/palette.png
  :width: 250px
  :align: center
  :alt: An example of a palette in EAGLE
  :figclass: align-center

  An example of a palette with a focused set of components for a single workflow

The breadth and depth of a palette is completely up to the palette developers.
One palette could contain every possible component for a domain, or it could be
much more narrow and cover a single sub-domain.

A palette developed for astronomy could potentially contain hundreds of radio
astronomy components, which would make it difficult to zero in on components
necessary to process an optical image. A more focused sub-domain palette could,
for instance, focus on one single experiment or instrument and only offer
components relevant to processing that data.


Creating Palettes Automatically from Source Code
------------------------------------------------

We have a method for automatically generating component descriptions from source code. It involves:

* Adding Doxygen comments to the source code
* Adding a CI task to the code repository, which:

  * Uses doxygen to process the source code and output XML documentation
  * Processes the XML with a EAGLE script called xml2palette.py
  * Commit/push the resulting palette JSON to the ICRAR/EAGLE_test_repo repository inside a directory named after the project

This process is described in further detail within the `DALiuGE Documentation <https://daliuge.readthedocs.io/en/latest/development/app_development/eagle_integration.html/>`_


Creating Palettes within EAGLE
------------------------------

EAGLE can be used to create new palettes. To create Palettes within EAGLE,
first open the EAGLE settings and enable the "Allow Palette Editing" setting.

The next step is to create a component you would like to place in a palette
within the EAGLE graph editor. Typically, as user would use a component within
the "All Nodes" palette as a starting point for a new component. For example, to
create a component for some Python code, a user would drag a "Python App" from
the "All Nodes" palette into the graph editor as a starting point.

Next, the user would customise the "Python App" component, changing the name and
description, and adding parameters and ports as appropriate.

Once the component is complete, it should be saved to a palette using the
"Add Selected Node to Palette" button at the top of the node inspector.
Since graphs usually require many components, a user could create and modify
multiple components within the graph editor, then add them all to a palette at
once, using the "Add Graph Nodes to Palette" button in the navbar.

.. figure:: _static/images/components/navbar_button.png
  :width: 240px
  :align: center
  :alt: Click the "Add graph nodes to Palette" button in the navbar
  :figclass: align-center

  Click the "Add graph nodes to Palette" button in the navbar

The user can then click the "cloud" icon to save to git, or the "floppy disk" icon to save locally.
As with other components, we'd recommend saving to ICRAR/EAGLE_test_repo in a directory named after the project

.. figure:: _static/images/components/new_palette.png
  :width: 500px
  :align: center
  :alt: The new palette containing the Docker component description
  :figclass: align-center

  The new palette containing the Docker component description
