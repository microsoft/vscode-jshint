/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { workspace, Disposable, ExtensionContext, commands } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, RequestType, TransportKind } from 'vscode-languageclient';

export function activate(context: ExtensionContext) {

	// We need to go one level up since an extension compile the js code into
	// the output folder.
	let serverModule = context.asAbsolutePath(path.join('jshint-server', 'out', 'server.js'));
	let debugOptions = { execArgv: ["--nolazy", "--inspect=6004"] };
	let serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions}
	};
	let clientOptions: LanguageClientOptions = {
		// Only lint files on disk, which are those with 'file' scheme
		documentSelector: [
			{
				language: 'javascript',
				scheme: 'file'
			},
			{
				language: 'javascriptreact',
				scheme: 'file'
			},
			{
				language: 'html',
				scheme: 'file'
			}
		],
		synchronize: {
			configurationSection: 'jshint',
			fileEvents: workspace.createFileSystemWatcher('**/.jshint{rc,ignore}')
		},
		initializationOptions: () => {
			const configuration = workspace.getConfiguration('jshint');
			return {
				nodePath: configuration && configuration.nodePath,
				packageManager: configuration && configuration.packageManager
			};
		}
	};

	let client = new LanguageClient('jshint', serverOptions, clientOptions);
	context.subscriptions.push(
		new SettingMonitor(client, 'jshint.enable').start(),
		commands.registerCommand('jshint.showOutputChannel', () => client.outputChannel.show())
	);
}