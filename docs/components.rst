Components
==========

A **component** is the building block of an EAGLE workflow. Each component is a self-contained description of an executable unit — an application, a data store, or a structural construct — along with its inputs, outputs, and parameters. Components are purely descriptive; the actual application code lives outside EAGLE and is invoked at execution time by the DALiuGE engine.

Components are stored in JSON files and organised into :doc:`palettes <palettes>` for easy reuse across workflows.

.. figure:: _static/images/placeholder.png
   :width: 600px
   :align: center
   :alt: [screenshot: several component types on the canvas — a Python app, a memory node, a file node, and a scatter construct]
   :figclass: align-center

   A selection of component types: an application, two data components, and a construct.

Component Types
---------------

Application Components
""""""""""""""""""""""

Application components wrap executable code. The DALiuGE engine imports and runs the specified application at execution time.

.. list-table::
   :widths: 25 75
   :header-rows: 1

   * - Type
     - Description
   * - **Python App** (PyFuncApp)
     - Runs a Python function or class. The *Application Class* parameter specifies the fully-qualified import path, e.g. ``dlg.apps.simple.HelloWorldApp``.
   * - **Bash Shell App**
     - Executes a shell command. Useful for wrapping command-line tools.
   * - **Dynamic Library App** (DynlibApp)
     - Loads and calls a compiled C/C++ dynamic library.
   * - **MPI App**
     - Runs an MPI-parallel application across multiple compute nodes.
   * - **Docker App**
     - Runs an application inside a Docker container. See `Creating Components for Docker Images`_ below.

Data Components
"""""""""""""""

Data components represent storage between application steps. Unlike application components, they do not run code — they hold data that flows between applications.

.. list-table::
   :widths: 25 75
   :header-rows: 1

   * - Type
     - Description
   * - **Memory**
     - Stores data in RAM. The fastest option; data is lost when the session ends. Recommended for intermediate results within a workflow.
   * - **File**
     - Reads or writes a file on disk. If no filename is set, DALiuGE generates a unique name at runtime.
   * - **S3**
     - Reads or writes an object in an S3-compatible object store.
   * - **NGAS**
     - Reads or writes data via the NGAS archiving system.

Construct Components
""""""""""""""""""""

Constructs control the execution structure of a workflow. They wrap other components and define how work is distributed or collected.

.. list-table::
   :widths: 25 75
   :header-rows: 1

   * - Type
     - Description
   * - **Scatter**
     - Splits an input dataset into *N* independent chunks and distributes them to components inside the construct. The ``Number of copies`` parameter controls the degree of parallelism.
   * - **Gather**
     - Collects results from parallel branches. ``Number of inputs`` sets how many inputs are gathered before the construct completes.
   * - **Loop**
     - Repeats the components inside it for a fixed number of iterations.
   * - **Group By**
     - Groups data by a key before passing it downstream.
   * - **MKN**
     - Maps *M* inputs to *K* outputs across *N* workers.

Parameters and Ports
--------------------

Every component exposes two categories of fields, visible in the inspector panel when a node is selected.

Component Parameters
""""""""""""""""""""

Parameters required by the DALiuGE engine to manage the component. These include settings such as the *Application Class* import path, execution constraints, and resource requirements. Most component parameters are set once by the component author and rarely need to be changed by graph builders.

Application Arguments
"""""""""""""""""""""

Arguments passed directly to the application payload — the equivalent of command-line arguments or function keyword arguments. These are the values that graph builders typically adjust per-workflow. For example, the ``Greet`` argument on ``HelloWorldApp`` controls what string is printed.

A parameter or argument can also be promoted to an **input port** or **output port**, meaning its value is read from or written to an upstream or downstream component via an edge, rather than being set statically.

.. figure:: _static/images/placeholder.png
   :width: 500px
   :align: center
   :alt: [screenshot: inspector panel showing component parameters and application arguments for a Python App node]
   :figclass: align-center

   The inspector panel showing parameters and arguments for a Python App component.

Connecting Components with Edges
---------------------------------

An output port on one component can be connected to an input port on another component using an **edge**. Edges are drawn as arrows on the canvas and represent data flowing from one component to the next, triggering execution.

To draw an edge, drag from an output port (right side of a node) to an input port (left side of another node). EAGLE validates the connection and shows a warning or error if it is inadvisable or invalid.

.. figure:: _static/images/placeholder.png
   :width: 600px
   :align: center
   :alt: [screenshot: three components connected by two edges with a valid connection indicator]
   :figclass: align-center

   Three components connected by edges.

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

   A warning (above) and an error (below) shown when a problematic edge is created.

Environment Variables
---------------------

``EnvironmentVars`` components act as a named, graph-wide key-value store. Any other component in the graph can reference a value from an ``EnvironmentVars`` store using the syntax:

.. code-block:: text

   $store_name.var_name

For example, if an ``EnvironmentVars`` component is named ``environment_vars`` and contains a parameter ``scratch_dir`` set to ``/users/me/scratch``, another component can reference it by setting its ``working_dir`` parameter to:

.. code-block:: text

   $environment_vars.scratch_dir

Each ``EnvironmentVars`` component in a graph must have a unique name to avoid conflicts. These variables are static — they are substituted at translation time and cannot be dynamically read or written during execution.

Creating Components for Docker Images
--------------------------------------

To use an application packaged in a Docker image:

1. Create a new graph and drag a **Docker** node from the Component Templates palette onto the canvas.
2. Select the node and fill in the following parameters in the inspector:

   - **Image** — the Docker Hub image name, e.g. ``icrar/leap_cli``
   - **Tag** — the image tag, e.g. ``0.8.1``
   - **Digest** — the hexadecimal digest of that image version
   - **Command** — the command to run inside the container
   - **User** — the user to run as
   - **Additional Bindings** — any host paths to mount into the container

.. figure:: _static/images/placeholder.png
   :width: 500px
   :align: center
   :alt: [screenshot: inspector panel for a Docker component with image, tag, and command fields filled in]
   :figclass: align-center

   Configuring a Docker component in the inspector panel.

3. Once configured, the component can be saved to a palette for reuse — see :doc:`Palettes <palettes>`.

.. note::
   DALiuGE requires Docker images to include ``/bin/bash``, ``/usr/bin/cat``, and ``/etc/passwd``. Including ``/usr/bin/ls`` is also recommended.