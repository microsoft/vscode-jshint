### 0.10.17

- Add support for configuring the location of `jshint` with the `jshint.nodePath` setting. This can be an absolute or relative path.
- Add `jshint.packageManager` setting, which can be either `npm` or `yarn`. This adds support for `jshint` installed globally with yarn.
- Fix for [#46](https://github.com/Microsoft/vscode-jshint/issues/46) only lint files on disk

### 0.10.18
- Add support for the `overrides` property in `.jshintrc` files.
- Add `jshint.trace.server` setting that can be set "off", "messages", or "verbose". When set to "messages" or "verbose", trace information will be shown in the `jshint` output panel. Defaults to "off". 
- Add `JSHint: Show output` command that will open the output panel on the `jshint` output channel. Information about where the `jshint` library is loaded from and
what file is being read for configuration options is shown here. If tracing is on, traces are displayed here as well.
- Provide schema for `jshint.options` setting so that completions are given when typing.

### 0.10.19
- Update dependencies
- Fix for [#22](https://github.com/Microsoft/vscode-jshint/issues/22) `.jshintignore` files incorrectly cached

### 0.10.20
- Update `vscode-languageserver` and `vscode-languageclient` versions

### 0.10.21
- Update lodoash dependency
- Fix for [#74](https://github.com/Microsoft/vscode-jshint/issues/74), schema for `settings.json` out of data
- Fix for [#68](https://github.com/Microsoft/vscode-jshint/issues/68), globals attribute in `package.json` not read after updating