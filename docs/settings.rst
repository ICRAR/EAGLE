Settings
===================

The settings in Eagle include user experience and interface related options. By default, Eagle is simplified by hiding a lot of functionality via the UI modes. These settings may also affect permissions of what may be modified. The settings menu can be found in the nav-bar as a cog icon, or by pressing the keyboard shortcut 'O'.

.. figure:: _static/images/eagle_settings_screenshot.png
  :width: 90%
  :align: center
  :alt: An example of a palette in EAGLE
  :figclass: align-center

  An example of a palette with a focused set of components for a single workflow

UI Modes
--------

Ui modes are collections of settings creating separate workspaces, each designed with a specific use case in mind.

**Minimal** - Designed for student use or when the goal is loading a graph, tweaking its key attributes and executing it through the translator.

**Graph** - Unlocks the permissions required for graph creation from pre-existing palettes and palette components

**Component** - Change all values on palette and graph components, as well as graph deployment functionality

**Expert** - Unlocks everything Eagle has to offer

Tabs Breakdown
--------------

**User Options**  -  General user experience options

**UI Options**  -  Settings that can simplify, hide or show sections of the UI that might not be necessary for a use case

**Advanced Editing**  -  Permission settings that unlock the ability to edit more components

**External Services**  -  This is where external services such as github and docker can be set up

**Developer**  -  Settings used by developers to debug Eagle

User Options
""""""""""""

**Reset Action Confirmations** - Enable all action confirmation prompts. EAGLE allows users to skip confirmation dialogs by clicking "Don't show me again" when dismissing them. This setting allows users to undo that action, re-enabling the confirmation dialogs.

**Disable JSON Validation** - Allow EAGLE to load/save/send-to-translator graphs and palettes that would normally fail validation against schema.

**Overwrite Existing Translator Tab** - When translating a graph, overwrite an existing translator tab.


UI options
""""""""""

**Show non key parameters** - Show additional parameters that are not marked as key parameters for the current graph.

**Translator Mode** - There are a few modes affecting the amount of permissions available:  **minimal** - using default algorithm and settings, hiding the translation tab. **Default** - using default algorithm allowing for some extra control via the translation tab. **Expert** - Offers additional translating algorithms.

**Graph Zoom Divisor** - The number by which zoom inputs are divided before being applied. Larger divisors reduce the amount of zoom.

**Show edge/node errors/warnings in Graph** - Show the errors/warnings found for the selected node/edge in the inspector, below the other editor widgets. Errors and warnings are always shown the the checkGraph display in the navbar.

Advanced Editing
""""""""""""""""

**Allow Invalid Edges** - Allow the user to create edges in the graph, even if they would normally be determined invalid.

**Allow Component Editing** - Allow the user to add/remove ports and parameters from components.

**Allow Modify Graph Configurations** - Allow the user to add/remove parameters from graph configurations.

**Allow Graph Editing** - Allow the user to create and edit graphs.

**Allow Palette Editing** - Allow the user to create and edit palettes.

**Allow Readonly Palette Editing** - Allow the user to modify palettes that would otherwise be readonly. These are usually only the default loaded palettes.

**Allow Edge Editing** - Allow the user to edit edge attributes.

**Filter Node Suggestions** - Filter node options when drawing edges into empty space.

**Value Editing** - Set which values are allowed to be edited. Possible values are: "Config Only", "Normal", "Readonly". "Config Only" means that only parameters within graph configurations are editable. "Normal" means that all parameters are editable, except those flagged as readonly. "Readonly" means that even readonly parameters are editable.

**Auto-complete edges level** - Specifies the minimum validity level of auto-complete edges displayed when dragging a new edge

External Services
"""""""""""""""""

**Translator URL** - The URL of the translator server

**GitHub Access Token** - A users access token for GitHub repositories.

**GitLab Access Token** - A users access token for GitLab repositories.

**Docker Hub Username** - The username to use when retrieving data on images stored on Docker Hub.

Developer
"""""""""

**Show Developer Notifications** - EAGLE generates a number of messages intended to alert developers to unusual occurrences or issues. Enabling this setting displays those messages.

**Show File Loading Warnings** - Display list of issues with files encountered during loading.

**Open Translator In Current Tab** - When translating a graph, display the output of the translator in the current tab.

**Create Applications For Construct Ports** - When loading old graph files with ports on construct nodes, move the port to an embedded application.

**Skip 'Closes Loop' Edges In JSON Output** - We've recently added edges to the LinkDataArray that 'close' loop constructs and set the 'group_start' and 'group_end' automatically. In the short-term, such edges are not supported by the translator. This setting will keep the new edges during saving/loading, but remove them before sending the graph to the translator.

**Print Undo State To JS Console** - Prints the state of the undo memory whenever a change occurs. The state is written to the browser's javascript console.

**Display all Category options** - Displays all category options when changing the category of a node

**Allow modified graph translation** - Allow users to submit graphs for translation even when not saved or committed

**Apply active graph config before translation** - Apply the active graph config to the graph before sending the graph for translation

**Fetch repository for URLs** - Automatically fetch the contents of the object's repository when a graph/palette is specified in the URL
