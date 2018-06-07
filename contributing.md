# VSCode JSHint

[![Build Status](https://travis-ci.org/Microsoft/vscode-jshint.svg?branch=master)](https://travis-ci.org/Microsoft/vscode-jshint)

Extension to integrate [JSHint](http://jshint.com/) into VS Code.

## Development setup
- Clone the repository
- run `npm install` at the root to install all dependencies
- open VS Code on the root
- use `npm run compile` to compile the client and server

An overview of writing VSCode extensions is available [here](https://code.visualstudio.com/docs/extensions/overview).

This extension uses a [Language Server](https://code.visualstudio.com/docs/extensions/example-language-server) to run `jshint`, so the extension is divided into client and server parts that will be run in separate processes by VSCode. The client handles the activation and setup of the extension. The server has the bulk of the code and handles running `jshint` on files to validate them.

To debug the extension, use the `Launch Extension` configuration from the debug view. Once this is running and the extension has been activated by opening a js file, the server can be debugged with the `Attach to Server` configuration.