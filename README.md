# nodejs-canon-control-server
An HTTP/Websockets server interface for the Canon EDSDK

Remotely control canon cameras connected to a windows machine via USB.  It is persently designed to work in conjunction with [nodejs-canon-control-client](https://github.com/UWStout/nodejs-canon-control-client) which is designed for a multi-camera photogrammetry workflow, but other clients could be built using this package as a backend and target other multi-camera workflows.

## Description
This project will create a simple server that provides two kinds of backends:
- A RESTful API with routes that allow query and control of canon cameras via the EDSDK on windows
- A socket.io connection for two-way client communication and live udpating of camera state

The primary goal of this server is to enable management of MANY cameras connected to several computers, especially querying their current modes and exposure settings and updating those modes and exposure settings.  It targets photogrammety work where many cameras (hundreds), possibly controled by several computers, capture images of an object form many angles simultaneously.

It is meant to provide the base functionality to create a tool like [Breeze Multi-camera Array](https://www.breezesys.com/solutions/breeze-multi-camera-event/) utilizing free and/or open-source technologies.

## Architecture
While this package (and its companion [nodejs-canon-control-client](https://github.com/UWStout/nodejs-canon-control-client)) are still written using traditional client and server technologies (as their names suggest), they are meant to be used in a somewhat unintuitive architecture.  They are intended to have MANY servers and ONE client.

Each server computer controls a sub-set of the overall set of cameras.  This is a common need as the cameras are often spread out and attempting to control hundreds of USB cameras through a single motherboard USB hub has known issues.  Splitting the cameras between multiple computers (and therefore multiple servers) makes for increased stability of the hardware connections and distributes the work of downloading and coordinating all of the cameras.

The client is designed to connect to MANY servers (you enter the list of servers in its settings) and control them all at once.  Moreover, it will not work correclty if mutliple clients attempt to connect to the same server (allthough this is not prevented, it is not the intended use-case and the behavior will be undefined).

## Features
At present, nodejs-canon-control-server supports most of the features exposed by the napi-canon-camera package:
- Automatic detection and listing of connected canon cameras along with their basic properties
- Reading and setting of exposure properties on a single camera
- Batch setting of exposure properties on multiple cameras
- Remote focusing (auto-focus) and triggering of cameras (one-by-one, not synchronized)
- Remove viewing of the live-view feed from a camera
- Automatic downloading of images to a common folder whenever the shutter is released
- Automatic verificaiton of exposure properties after images are downloaded
- EXPERIMENTAL: Download of multiple images at once via worker threads

## Note on Security
This application interacts with physical hardware connected to your computer and allows you to control it remotely. This is inherently INSECURE and not intended to be done across the internet or via large WANs. Because of this, we have not attempted to harden or vet the overall security of this package like a standard "server" should be. It is NOT a normal server and should only be used on a firewalled local area network and it should only bind to a local IP address and not to a global IP or FQDN.

Failure to follow this advice may result in damage to your cameras, security flaws in your network, potential for systemwide intrusion, or other major security breaches of the entire network system! The use case for this package has always been and will remain a local area use case and you should treat it as such.

## Dependencies
You can examine the package.json to see the usual dependencies.  There is one unusual dependency: [napi-canon-cameras](https://github.com/dimensional-de/napi-canon-cameras).  To build this dependency you must have a copy of the EDSDK which is provided by Canon.  The EDSDK cannot be publically redistributed so you must obtain this library and build napi-canon-cameras yourself (see the readme for that project).

To simplify sharing and installation, we include a pre-built version of this module under 'node_packages' but we may remove this in the future.

## Project Personele, Funding, and Mission
This project was originally created by Prof. Seth Berrier (Olliebrown on Github), an instructor at the University of Wisconsin Stout in the Math, Stats, and Computer Science department with the help of many undergraduate and masters students (including Darcy Hannen, Samson Smith, and Tommy Ladwig).

The research project associated with this code was funded by the Nation Science Foundation as part of a Major Research Instrumentation grant (award #1950289) which resulted in the creation of the PARSEC photogrammetry and scanning lab on the UW Stout campus.  It is part of our mission on the PARSEC project to open up access to research into photogrammetry and material scanning by providing free guides, software, and data related to these practices.

nodejs-canon-control-server and its companion client is a big part of this effort, removing the need to license and maintain a tool like Breeze Multi-Camera Array which is targeted towards the Hollywood and SFX industries and has a funding model that is not viable for accademic research outside of the lucrative industry grants that support only a small elite set of researchers largely based in California.
