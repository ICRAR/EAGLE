Components
==========

Components are the building blocks of workflows in EAGLE.
Each component represents executable logic or data handling behavior.

Common component categories include:

- Application components: shell, Python, C/C++, MPI, and other payloads.
- Data components: Memory, File, S3, NGAS, and related data stores.

EAGLE works from component descriptions (JSON metadata).
These descriptions define ports, parameters, and behavior needed for editing and translation.

.. figure:: _static/images/components.png
  :width: 400px
  :align: center
  :alt: An example of components in EAGLE
  :figclass: align-center

  Components have inputs, outputs, and parameters, and are connected by edges.

Component Parameterisation
--------------------------

A component usually has two kinds of values:

- Component parameters: required by DALiuGE to instantiate and manage the component.
- Application arguments: values passed to the payload code.

Example:

- ``Application Class`` can point to ``dlg.apps.simple.HelloWorldApp``.
- ``Greet`` can be set to ``World`` and changed by users or graph configuration.

Parameters and arguments can also be exposed as input or output ports.
This lets upstream components drive downstream behavior.

Creating Components for Docker Images
-------------------------------------

You can create Docker-based components from container metadata.
A common workflow is:

1. Pick an image on Docker Hub.
2. Add a Docker node from a template palette.
3. Fill image details (name, tag, digest) and runtime settings.
4. Save the configured node into your palette.

.. figure:: _static/images/components/new_node.png
  :width: 210px
  :align: center
  :alt: A new graph containing a single Docker node
  :figclass: align-center

  Start from a Docker node template.

.. figure:: _static/images/components/modify_parameters.png
  :width: 500px
  :align: center
  :alt: Modify the Docker node parameters with data from the Docker image
  :figclass: align-center

  Fill Docker parameters from your selected image.

Important Notes on Docker Images
--------------------------------

For DALiuGE execution compatibility, Docker images should include:

- ``/bin/bash``
- ``/usr/bin/cat``
- ``/etc/passwd``

Recommended:

- ``/usr/bin/ls``

Linking Components with Edges
-----------------------------

Edges connect output ports to input ports and define execution and data flow.
EAGLE validates edge compatibility and warns about risky links.

.. figure:: _static/images/components2.png
  :width: 500px
  :align: center
  :alt: An example of components linked together with edges
  :figclass: align-center

  Components linked with edges.

.. figure:: _static/images/edgeWarning.png
  :width: 400px
  :align: center
  :alt: An example of a warning provided for an edge
  :figclass: align-center

.. figure:: _static/images/edgeError.png
  :width: 400px
  :align: center
  :alt: An example of an error provided for an edge
  :figclass: align-center

  Edge validation warnings and errors.

Environment Variables
---------------------

EAGLE supports global key-value variables through ``EnvironmentVars`` components.
Use them for values reused across many components.

Rules:

- Each ``EnvironmentVars`` component must have a unique component name.
- Reference values using ``$store_name.var_name``.

Example:

- Store name: ``environment_vars``
- Variable: ``scratch_dir``
- Reference from another component: ``$environment_vars.scratch_dir``

These values are static at graph definition time.
Dynamic runtime updates are not currently supported.