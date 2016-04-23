# VS Code JSHint extension

Integrates [JSHint](http://jshint.com/) into VS Code.

## Configuration Options

The jshint extension uses the standard jshint configuration options described on the [jshint web site](http://jshint.com/docs/options/).

The options can be specified in a number of locations mostly mimicing jshint's default behavior. The extension looks for its configuration options the following way and stops at the first positive match:

1. An options file specified in the user or workspace settings like this: `"jshint.options" : { "config" : "<file path>" }`
1. The value of the `jshintConfig` attribute in a `package.json` file located in the current directory or any parent of the current directory.
1. A `.jshintrc` file located in the current directory or any parent of the current directory.
1. A `.jshintrc` file located in the user's home directory.
1. The values specified within `jshint.options` in the user or workspace settings. By default `jshint.options` is empty.

In order to disable jshint for a workspace specify `"jshint.enable" : false` in the workspace settings. jshint is enabled by default.

In order to ignore specific files or folders from being linted use `"jshint.exclude" : { "<glob pattern>" : true, "<glob pattern>" : true }` in the workspace or user settings. No files are excluded by default.