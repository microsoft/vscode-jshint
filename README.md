# VSCode JSHint

[![Build Status](https://travis-ci.org/Microsoft/vscode-jshint.svg?branch=master)](https://travis-ci.org/Microsoft/vscode-jshint)

Extension to integrate [JSHint](http://jshint.com/) into VS Code.

## Development setup
- run `npm install` at the root to install all dependencies
- open VS Code on the root
- use `npm run compile` to compile the client and server

To debug the extension, use the `Launch Extension` configuration from the debug view. Once this is running and the extension has been activated by opening a js file, the server can be debugged with the `Attach to Server` configuration.