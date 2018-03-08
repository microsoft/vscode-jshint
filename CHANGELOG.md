### 0.10.17

- Add support for configuring the location of `jshint` with the `jshint.nodePath` setting. This can be an absolute or relative path.
- Add `jshint.packageManager` setting, which can be either `npm` or `yarn`. This adds support for `jshint` installed globally with yarn.
- Fix for [#46](https://github.com/Microsoft/vscode-jshint/issues/46) only lint files on disk