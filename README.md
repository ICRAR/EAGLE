# EAGLE

## Introduction

The Advanced Graph Language is a visual programming language used to develop
complex processing pipelines or workflows. EAGLE is the visual editor for this
environment. EAGLE is coupled to the [DALiuGE](http://github.com/ICRAR/daliuge)
execution framework, which also provides the actual translation and execution
of the workflows.

## Installation
Please refer to the guide in doc/INSTALL.md

## Basic Concepts

EAGLE envisions the development of executable workflows in three distinct steps.
These steps will typically be performed on different time scales and potentially
also by different people. These three steps are:

1. Development of a set of processing components.
1. Development of workflows (pipelines) using the components from step 1.
1. Execution of workflows (pipelines) developed in step 2.

In order to support the three steps of development EAGLE provides three
modes:

The **Palette Editor** mode allows to visually generate domain specific
palettes (or languages) for arbitrary domains based on generic processing
component templates. Processing components in EAGLE are blocks wrapping actual
executable code. The executable code itself and the development of it is not
part of the EAGLE environment, but obviously required for the execution.
The mode allows to define input and output interfaces (types) as well as user
defined and fixed parameters for the processing components.

The **Logical Graph Template Editor** mode allows to use a palette to develop so-called
logical graph templates, which represent logical workflows or pipelines for data
processing. This is done by drag-and-drop of processing components from the
chosen palette into a drawing area and then connecting the interfaces. The
editor checks the interface types and only allows to connect matching interfaces
types. *Logical Graph Templates* are saved without setting the user definable
parameters of the processing components, hence they are referred to as *Templates*.

The **Translation** or **Logical Graph Editor** mode allows to set the user defined parameters of the processing components and submit the resulting *Logical Graph* to the DALiuGE translation engine to translate it into a physical graph (execution plan). The mode also allows to send the generated *Physical Graph* for execution to a machine or cluster running the DALiuGE execution engine. Neither the translation nor the execution engine are part of EAGLE and are just called (and displayed) as RESTful web-services, submitting a JSON representation of the graphs.

Logical Graph Templates and Palettes are maintained in GitHub repositories and are thus version controlled. In order to support this, EAGLE is internally using the GitHub API. We do envision the *Palettes* to stabilise over time for a given domain. *Logical Graph Templates* will probably evolve more frequently and *Logical Graphs* in general will be specific for every single execution of that workflow and thus change frequently.

## Detailed Concepts
In addition to the coarse grain concepts underlying the three EAGLE modes, there are a number of concepts, which require some explanation for the user to be able to understand the terminology and also how EAGLE is supposed to be used.

### Processing Components

EAGLE has been developed with a clear separation of concerns and also operational constraints in mind. The actual executable code behind the processing components is left completely outside of this environment and can thus be developed independently. EAGLE then supports various ways of wrapping (and calling) code, including command line (shell), in-line Python and C/C++ dynamic library as well as MPI components. Each of these provide slightly different underlying functionality and integration. Obviously during execution of a workflow the executables need to be available to the execution engine, but when developing a *Palette* or a *Logical Graph Template* this is not required. In fact EAGLE does not have access to the executable code at all, but only to the JSON representation of the *Processing Components*. One of the main requirements for the development of EAGLE and DALiuGE was to be able to re-use existing code as easily as possible, while still enabling more optimised and integrated ways of implementing or migrating algorithms. The same holds for granularity and potential parallelism of processing. If you can run some code on the command line, you can also run it inside DALiuGE and developing a *Processing Component* for that code in EAGLE is very straight forward. If that *Processing Component* happens to contain a complete and complex workflow all by itself, neither EAGLE nor DALiuGE would see any of that, but just the input and output and the exposed parameters. If, on the other side of the spectrum, your code would be just a single mathematical operation in Python or C, you can wrap that as well in a *Processing Component*. Neither of these two extremes are particularly useful in general, but might be for specific problems, or in combination with other *Processing Components* or as part of a parallel reduction of many individual data sets (see below).

### Palettes
*Palettes* are simply a collection of *Processing Components* defined for a specific domain or sub-domain. They merely are a convenience to provide a focused view of components available in your environment. The breadth and depth of a palette is completely up to the palette developers. A palette could contain every possible component ever developed for a domain, or it could be very narrow to cover just a sub-domain. EAGLE has been developed in the context of radio astronomy as a domain, but since it is completely generic, it could be used for any other astronomy domain, or any other scientific or non-scientific domain for that matter. Even just within astronomy it would be quite confusing to see potentially hundreds of radio astronomy components, if all you want to do is process an optical image. Sub-domain palettes could for instance focus on exactly one experiment or instrument and only offer components relevant to the processing of that data.

### Logical Graph Templates
Also *Logical Graph Templates* are likely very specific for one experiment or instrument, or at least a very focused processing workflow. They do allow limited flexibility in the form of user defined parameters to be specified before an actual execution. In an operational environment *Logical Graph Templates* represent processing modes and will be quite stable after some time. In fact we envision that EAGLE will not be involved at all in the parameterisation and submission in such an environment. *Logical Graph Templates* can and will get fairly complex quite fast, but thinking in the *Logical Graph Template* context tends to highlight the inherent parallelism and also the potential bottlenecks. *Logical Graph Templates* in a way provide a birds-eye view of an arbitrarily parallel process, without actually showing or exposing the parallelism explicitly.

### Logical Graphs
*Logical Graphs* are constructed from *Logical Graph Templates* by setting the exposed parameters of the *Processing Components*. In general most of these parameters are settings that influence the behaviour of the components, some others might be derived from the size or the parameterisation of the data being processed. In future we are planning to save the *Logical Graph* as part of the data product provenance data and/or logs of the individual processing runs. This would then enable reproducibility as long as the original input data is still available.

### Physical Graph Templates
*Physical Graph Templates* are calculated from *Logical Graphs* by the DALiuGE translation engine. They are thus not strictly part of EAGLE, but displayed in the same web interface. They represent a translation of the *Logical Graphs* into *Directed Acyclic Graphs* and a mapping of that graph onto the potentially available cluster. The DALiuGE translation engine implements multiple algorithms for the translation, but the result is always a *Physical Graph Template* partitioned in a way to meet the hardware capabilities and any additional constraints given to the algorithms (e.g. minimise run-time). In principle *Physical Graph Templates* can be generated as soon as the parameterisation of the actual reduction run is clear. Since some of the translation algorithms are quite expensive and time consuming to run, generating them as early as possible is probably a good mitigation strategy.

### Physical Graphs
*Physical Graphs* represent the final mapping of the *Physical Graph Templates* to the actually available computer node(s), just before the execution. Again this is not part of EAGLE, but EAGLE does display the deployed graph and shows progression of the execution. Note that the visualisation during execution time is just informative and will for sure not scale to many thousands or millions of tasks. However, it is a really good tool during graph development, since it shows failures immediately. *Physical Graphs* are completely bound to an actual execution of a workflow. We do intend to save them as well as part of the logs.

### Logical Graph Template and Palette Repositories
*Palettes* and *Logical Graph Templates* are the result of a potentially quite intense development effort and thus we have decided to provide means of storing and versioning of that development effort. This is implemented in the form of an interface to GitHub using the GitHub API. It is possible to use EAGLE without it, by saving to your local drive or within the browser. However, the recommended way is to use GitHub, in particular in an operational environment, or in a typical scientific collaboration. This not only provides a complete history of the development, it also provides the means to re-producibility of individual runs. Both *Palettes* and *Logical Graph Templates* can be kept in a single repository and EAGLE will detect what it is loading or saving. However, it does make sense to keep some kind of order in the repository itself. Users can also work with multiple repositories in the same session and re-use or even copy components and graphs from one to the another. By using GitHub it is also quite simple to use any other tools to access the repositories.

## Additional Concepts
### Drops
*Drops* are a concept introduced very early during the design of the execution framework. They don't really appear in EAGLE at all, but nevertheless it is an important part of the complete system and thus also introduced here. Many standard data driven or data flow systems are using graphs either explicitly or implicitly as part of the coding of the flow execution. In those graphs data typically is represented as edges on the graph, between the nodes, representing the computational tasks. In DALiuGE we went further and raised the data to be nodes on the graph as well. Edges in DALiuGE graphs are events. In fact we are implementing data nodes (*Data Components*) in a similar way as task nodes (*Processing Components*) and they both are active objects in memory during runtime. By doing this we ended up in a small naming dilemma, because we had *ApplicationTasks* and *DataTasks*, which are internally both derived from the same base class. We thus decided to name the base class something neutral and called it **Drop**. The derived classes and objects are then DataDrops and ApplicationDrops. Like ApplicationDrops there are various flavours of DataDrops available in order to support more optimised data transfer and communication between the ApplicationDrops during run-time. Currently there are file, memory, S3 and NGAS DataDrops, but this list can be expanded by implementing other derived classes. These various existing DataDrops are represented by EAGLE during the graph development in the following way. When you drag-and-drop two of the *Processing Components* onto the graph dashboard and then try to connect them (provided the ports are compatible), you will be presented with a menu asking which of the available DataDrop types you would like to use. Once selected the data node will also appear on the graph in between the two processing nodes. Again in reality EAGLE users don't really need to know about Drops, but it might seem a bit odd to see this pop-up menu appearing.

## Compatibility
In particular the concept of raising the DataDrops to the same level of the ApplicationDrops seem to be very much DALiuGE centric and prevent the generated graphs from being used by other execution engines. However, since the graphs are stored as plain JSON strings and since we do have a (independent) translation layer to physical graphs in any case, there is no reason to assume that it would be impossible or even very hard to translate the *Logical Graphs* into something else, like for instance TensorFlow or Dask graphs.
