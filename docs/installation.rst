Installation
============

The quickest way to use EAGLE is the hosted public instance at `eagle.icrar.org <https://eagle.icrar.org>`_ — no installation required. If you need to run EAGLE locally, Docker is the preferred method.

Using Docker
------------

Docker images bundle all dependencies and are kept up to date with each release. Three image targets are available.

Deployment Image
""""""""""""""""

The standard production image. Build and start it with:

.. code-block:: shell

   git clone https://github.com/ICRAR/EAGLE.git
   cd EAGLE
   ./build_eagle.sh dep
   ./run_eagle.sh dep

EAGLE will be available at ``http://localhost:8888``. To stop and remove the container:

.. code-block:: shell

   ./stop_eagle.sh dep

Development Image
"""""""""""""""""

Maps your local EAGLE directory into the container so that changes to TypeScript source and static files are reflected immediately without rebuilding.

.. code-block:: shell

   ./build_eagle.sh dev
   ./run_eagle.sh dev

This starts the container in the foreground and watches TypeScript files for changes. Press ``Ctrl+C`` to stop. If changes are not appearing, restart the gunicorn server:

.. code-block:: shell

   docker/restart_gunicorn.sh

.. note::
   Changes to files under ``eagleServer/`` are not picked up by the live-reload watcher. A full restart is required for those.

Slim Image
""""""""""

A reduced-size image intended for releases, built using `SlimToolkit <https://github.com/slimtoolkit/slim>`_:

.. code-block:: shell

   ./build_eagle.sh slim

Local Installation (Without Docker)
------------------------------------

For development or debugging without Docker.

Prerequisites
"""""""""""""

- Python 3.8 or later
- Node.js LTS — download from `nodejs.org <https://nodejs.org>`_ (macOS) or install via ``sudo apt install npm`` (Linux)
- TypeScript (install globally): ``sudo npm install -g typescript``

Steps
"""""

.. code-block:: shell

   git clone https://github.com/ICRAR/EAGLE.git
   cd EAGLE
   npm install
   tsc
   pip install .
   eagleServer -t /tmp

EAGLE will be available at ``http://localhost:8888``.

When actively developing, run the TypeScript compiler in watcher mode so it recompiles automatically on changes:

.. code-block:: shell

   tsc -w

Requirements for Docker-based Components
-----------------------------------------

DALiuGE can only execute applications from Docker containers that satisfy the following requirements:

- A Bash shell at ``/bin/bash``
- ``/usr/bin/cat``
- ``/etc/passwd``
- ``/usr/bin/ls`` (recommended)
