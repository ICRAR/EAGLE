Installation
============

You can use EAGLE online or run it locally.

- Online: https://eagle.icrar.org
- Local: Docker (recommended) or a non-Docker setup

Docker Installation (Recommended)
---------------------------------

Docker is the fastest way to run EAGLE locally.

Available image targets:

#. deployment (dep)
#. development (dev)
#. slim (slim)

Deployment image
""""""""""""""""

Build and run:

.. code-block:: shell

    git clone https://github.com/ICRAR/EAGLE.git
    cd EAGLE
    ./build_eagle.sh dep
    ./run_eagle.sh dep

Open:

http://localhost:8888

Stop:

.. code-block:: shell

    stop_eagle.sh dep

Development image
"""""""""""""""""

Use this mode while editing and testing:

.. code-block:: shell

    ./build_eagle.sh dev
    ./run_eagle.sh dev

Notes:

- Runs in the foreground.
- Watches TypeScript source changes.
- Changes under ``static/`` are reflected immediately.
- Stop with ``CTRL+C``.

If backend changes are not picked up, restart gunicorn:

.. code-block:: shell

    docker/restart_gunicorn.sh

Slim image
""""""""""

Used mainly for release packaging and smaller image size.
It uses `SlimToolkit <https://github.com/slimtoolkit/slim>`_.

Non-Docker Installation
-----------------------

Use this path for local debugging without Docker.

Setup and dependencies
""""""""""""""""""""""""

Clone the repository:

.. code-block:: shell

    git clone https://github.com/ICRAR/EAGLE
    cd EAGLE

Install Node.js LTS from https://nodejs.org.
On Linux, you can also use:

.. code-block:: shell

    sudo apt install npm

Install TypeScript globally:

.. code-block:: shell

    sudo npm install -g typescript

Install JavaScript dependencies:

.. code-block:: shell

    npm install

Compile TypeScript:

.. code-block:: shell

    tsc

Or use watch mode while developing:

.. code-block:: shell

    tsc -w

Create and activate a Python environment (example using ``pyenv``):

.. code-block:: shell

    pyenv virtualenv -p python3.8 eagle
    pyenv activate eagle

Install EAGLE:

.. code-block:: shell

    pip install .

Run local server
""""""""""""""""""

Start EAGLE:

.. code-block:: shell

    eagleServer -t /tmp

Optional debug mode:

.. code-block:: shell

    eagleServer -t /tmp --debug

Tools
-----

To upgrade older graph formats, run ``updateGraph`` from the ``tools`` directory:

.. code-block:: shell

    cd tools
    ts-node updateGraph.ts <input_file> <output_file>
