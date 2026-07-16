Installation
============

You can use EAGLE online or run it locally.


Docker Images

Docker is the fastest path to a working local instance.
Available image targets:

#. deployment (dep)
#. development (dev)
#. slim (slim)

Deployment Image
""""""""""""""""

Build and run the deployment image:

.. code-block:: shell

    git clone https://github.com/ICRAR/EAGLE.git
    cd EAGLE
    ./build_eagle.sh dep
    ./run_eagle.sh dep

Open EAGLE at:

http://localhost:8888

Stop the container:

.. code-block:: shell

    stop_eagle.sh dep

Development Image
""""""""""""""""""""

Use this mode when editing frontend files and testing changes quickly.

.. code-block:: shell

    ./build_eagle.sh dev
    ./run_eagle.sh dev

This mode runs in the foreground and watches TypeScript sources.
Changes under ``static/`` are reflected immediately.

To stop, press ``CTRL+C`` in that terminal.

If backend changes are not picked up, restart gunicorn:

.. code-block:: shell

    docker/restart_gunicorn.sh

Slimmed Deployment Image
""""""""""""""""""""""""

This target is mainly for release packaging and smaller image size.
It uses `SlimToolkit <https://github.com/slimtoolkit/slim>`_.

Non-docker Installation

Use this path for local debugging without Docker.

Clone EAGLE Repository
"""""""""""""""""""""""

.. code-block:: shell

    git clone https://github.com/ICRAR/EAGLE
    cd EAGLE

Install NPM
"""""""""""

Install Node.js LTS from https://nodejs.org.
On Linux, you can also use:

.. code-block:: shell

    sudo apt install npm

Install TypeScript
""""""""""""""""""

Install TypeScript globally:

.. code-block:: shell

    sudo npm install -g typescript

Install Dependencies Using NPM
""""""""""""""""""""""""""""""

Install JavaScript dependencies:

.. code-block:: shell

    npm install

Compile TypeScript
""""""""""""""""""

Compile once:

.. code-block:: shell

    tsc

Or run watch mode while developing:

.. code-block:: shell

    tsc -w

Create and Activate a Virtual Environment
""""""""""""""""""""""""""""""""""""""""""

Use a dedicated Python environment.
Example with ``pyenv``:

.. code-block:: shell

    pyenv virtualenv -p python3.8 eagle
    pyenv activate eagle

Install EAGLE
"""""""""""""

.. code-block:: shell

    pip install .

Start Server
""""""""""""

Run the local server:

.. code-block:: shell

    eagleServer -t /tmp

Tools

To upgrade older graph formats, run ``updateGraph`` from the ``tools`` directory:

.. code-block:: shell

    cd tools
    ts-node updateGraph.ts <input_file> <output_file>