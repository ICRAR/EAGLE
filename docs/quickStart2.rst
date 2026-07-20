Quick Start Guide
=================

This page gives you the fastest path to building your first workflow.
You can test everything on the `public installation <https://eagle.icrar.org/?service=GitHub&repository=ICRAR/EAGLE-graph-repo&branch=master&path=examples&filename=HelloWorld-simple.graph>`_.

GitHub access and token setup
-----------------------------

GitHub setup is important for day-to-day EAGLE use.

Without a token
"""""""""""""""

You can still load graphs and palettes from public repositories.
This is useful for first-time users and quick testing.

Limitations without a token:

* You cannot save changes back to GitHub from EAGLE.
* You cannot access private repositories.
* GitHub API requests are heavily rate-limited for anonymous users (typically around 60 requests per hour per IP).

Classic personal access token
"""""""""""""""""""""""""""""

EAGLE currently uses a GitHub personal access token (classic).
Fine-grained tokens are not currently used in EAGLE.

The screenshot below shows the permissions used when creating a token for EAGLE.

.. raw:: html

        <details class="token-permissions-details">
            <summary class="token-permissions-toggle"><strong>Show token permission screenshot</strong></summary>
            <p>
                <img src="_static/images/github_token_settings.png" alt="GitHub classic personal access token permissions for EAGLE" style="width: 100%; max-width: 100%; height: auto; display: block; margin-top: 0.75rem;" />
            </p>
            <p><em>Example GitHub classic token configuration for EAGLE.</em></p>
        </details>

Based on this setup, enable:

* ``repo``
* ``read:user``
* ``read:public_key``

Set your token in EAGLE under :doc:`Settings <settings>` in ``External Services`` -> ``GitHub Access Token``.

The in-app Quick Start tutorial also walks through adding the token.
You can launch it directly on live EAGLE here:
`Start Quick Start Tutorial <https://eagle.icrar.org/?tutorial=Quick%20Start>`_.

For token creation steps, see the official GitHub guide:
`Managing your personal access tokens <https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens>`_.

Loading a Palette
-----------------

Workflows are built from :doc:`components <components>`.
Components are grouped in :doc:`palettes <palettes>` so you can find the right nodes quickly.

To load a palette from GitHub, add your GitHub token in settings first.

.. raw:: html
    :file: _static/video1.html

Creating a new graph
--------------------

Create a graph from the ``New`` menu, then drag components from the loaded palette.

Tips for first-time users:

* Connect components with clear data flow from left to right.
* Use data components (for example Memory or File) to make data movement explicit.
* Start small, then add branches or loops.

The video below walks through graph creation in the editor.

.. raw:: html
    :file: _static/video2.html

Saving a graph to gitHub
------------------------

To save your graph, add a repository you can write to.
If needed, create a new repo first.

Saving also requires a GitHub Personal Access Token.
The video shows token setup and repository save steps.

.. raw:: html
    :file: _static/video3.html
