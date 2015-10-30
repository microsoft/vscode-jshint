import * as path from 'path';
import { window, workspace, commands } from 'vscode';
import { LanguageClient, ClientOptions, ClientStarter, RequestType } from 'vscode-languageclient';

export function activate() {

	// We need to go one level up since an extension compile the js code into
	// the output folder.
	let module = path.join(__dirname, '..', 'server', 'server.js');
	let debugOptions = { execArgv: ["--nolazy", "--debug=6004"] };
	let clientOptions: ClientOptions = {
		server: {
			run: { module },
			debug: { module, options: debugOptions}
		},
		languageSelector: ['javascript', 'javascriptreact'],
		configuration: 'jshint',
		fileWatchers: workspace.createFileSystemWatcher('**/.jshintrc')
	}

	let client = new LanguageClient('JSHint Linter', clientOptions);
	new ClientStarter(client).watchSetting('jshint.enable');
}