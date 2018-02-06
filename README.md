# VS Code JSHint extension

Integrates [JSHint](http://jshint.com/) into VS Code.

## Configuration Options

The jshint extension uses the standard jshint configuration options described on the [jshint web site](http://jshint.com/docs/options/).

The options can be specified in a number of locations mostly mimicing jshint's default behavior. The extension looks for its configuration
options the following way and stops at the first positive match:

1. An options file specified in the user or workspace settings like this: `"jshint.config" : "<file path>"`. The file path is interpreted relative to the workspace's root folder.
1. The value of the `jshintConfig` attribute in a `package.json` file located in the current directory or any parent of the current directory.
1. A `.jshintrc` file located in the current directory or any parent of the current directory.
1. A `.jshintrc` file located in the user's home directory.
1. The values specified within `jshint.options` in the user or workspace settings. By default `jshint.options` is empty.

`.jshintrc` files can be chained using the `extends` attribute as described [here](http://jshint.com/docs/cli/#special-options).


## Exclude Options

In order to ignore specific files or folders from being linted exclude options can be specified in a number of locations
mostly mimicing jshint's default behavior. The extenion looks for its exclude options the following way and stops at the first positive match:

1. A file specified in the user or workspace settings like this: `"jshint.excludePath" : "<file path>"`. The file path is interpreted relative to the workspace's root folder.
The file contains glob patterns specifying files that should be excluded. The glob patterns are interpreted relative to the workspace's root folder.
1. A `.jshintignore` file located in the current directory or any parent of the current directory. The glob patterns in this file are interpreted relative to the location of the
`.jshintignore` file.
1. The value of the `jshint.exclude` attribute in the user or workspace settings. The attribute has the following form: `"jshint.exclude" : { "<glob pattern>" : true, "<glob pattern>" : true }`.
The glob patterns are interpreted relative to the workspace's root folder.

The glob patterns are interpreted using the npm `minimatch` module. Be aware that there are slight differences between `minimatch` and how `.gitignore` patterns are interpreted.
Most noteably, `**/name` and `name` are not the same in `minimatch` whereas they are consider equal in `.gitignore`. Always use `**/name` if you want to match a name within a subtree.

No files are excluded by default.

## Disable JSHint

In order to disable jshint for a workspace specify `"jshint.enable" : false` in the workspace settings. jshint is enabled by default.