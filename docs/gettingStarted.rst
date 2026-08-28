Getting Started
===============

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
To access the tutorial, follow the steps in the next section.

For token creation steps, see the official GitHub guide:
`Managing your personal access tokens <https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens>`_.

Getting started with the UI
---------------------------

We offer several in-app tutorials to help you familiarize yourself with EAGLE. You can launch them directly on the live EAGLE instance:

* `Quick Start <https://eagle.icrar.org/?tutorial=Quick%20Start>`_ for a guided tour of the user interface.
* `Graph Building <https://eagle.icrar.org/?tutorial=Graph%20Building>`_ for creating and editing a graph from scratch.
* `Graph Configurations <https://eagle.icrar.org/?tutorial=Graph%20Configurations>`_ for setting up reusable graph configuration values.

For a longer walkthrough of the full workflow, see :doc:`Hello World Example <helloWorld>`.