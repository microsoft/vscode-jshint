# VSCode JSHint

[![Build Status](https://travis-ci.org/Microsoft/vscode-jshint.svg?branch=master)](https://travis-ci.org/Microsoft/vscode-jshint)

Extension to integrate [JSHint](http://jshint.com/) into VS Code.

## Development setup
- run npm install inside the `jshint` and `jshint-server` folders
- open VS Code on `jshint` and `jshint-server`

## Developing the server
- open VS Code on `jshint-server`
- run `npm run compile` or `npm run watch` to build the server and copy it into the `jshint` folder
- to debug press F5 which attaches a debugger to the server

## Developing the extension/client
- open VS Code on `jshint`
- run F5 to build and debug the extension