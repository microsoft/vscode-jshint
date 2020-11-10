/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { workspace, Disposable, ExtensionContext, commands, Uri, window, QuickPickItem } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, RequestType, TransportKind } from 'vscode-languageclient';


interface LibraryUsageConfirmationParams {
	isGlobal: boolean;
	path: string;
}
export const libraryConfirmationType = new RequestType<LibraryUsageConfirmationParams, boolean, void, void>('jshint/confirmLibraryUsage');

const JSHINT_LIBRARY_CONFIRMATION_KEY = 'jshint/libraryConfirmations';
const JSHINT_ALWAYS_ALLOW_EXECUTION_KEY = 'jshint/alwaysAllowExecution';

enum ConfirmationSelection {
	deny = 1,
	allow = 2,
	alwaysAllow = 3
}

export async function activate(context: ExtensionContext) {

	// We need to go one level up since an extension compile the js code into
	// the output folder.
	let serverModule = context.asAbsolutePath(path.join('jshint-server', 'out', 'server.js'));
	let debugOptions = { execArgv: ["--nolazy", "--inspect=6004"] };
	let serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
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
			fileEvents: [workspace.createFileSystemWatcher('**/.jshint{rc,ignore}'), workspace.createFileSystemWatcher('**/package.json')]
		},
		initializationOptions: () => {
			const configuration = workspace.getConfiguration('jshint');
			return {
				nodePath: configuration && configuration.nodePath,
				packageManager: configuration && configuration.packageManager
			};
		}
	};

	context.subscriptions.push(commands.registerCommand('jshint.resetLibraryExecutions', async () => {
		interface JSHintQuickPickItem extends QuickPickItem {
			kind: 'all' | 'session';
		}
		const items: JSHintQuickPickItem[] = [
			{ label: 'Reset JSHint library decisions for this workspace', kind: 'session' },
			{ label: 'Reset all JSHint library decisions', kind: 'all' }
		];

		const selected = await window.showQuickPick<JSHintQuickPickItem>(items, { placeHolder: 'Clear library confirmations'});
		if (selected === undefined) {
			return;
		}

		if (selected.kind === 'all') {
			await context.globalState.update(JSHINT_LIBRARY_CONFIRMATION_KEY, {});
		} else if (selected.kind === 'session') {
			if (sessionPath) {
				delete libraryConfirmations[sessionPath];
				await context.globalState.update(JSHINT_LIBRARY_CONFIRMATION_KEY, libraryConfirmations);
			}
		}

		context.globalState.update(JSHINT_ALWAYS_ALLOW_EXECUTION_KEY, false);
		alwaysAllowExecution = false;
		client.sendRequest('jshint/resetLibrary')
	}));

	let client = new LanguageClient('jshint', serverOptions, clientOptions);
	context.subscriptions.push(
		new SettingMonitor(client, 'jshint.enable').start(),
		commands.registerCommand('jshint.showOutputChannel', () => client.outputChannel.show())
	);

	const libraryConfirmations = context.globalState.get<{ [key: string]: boolean }>(JSHINT_LIBRARY_CONFIRMATION_KEY, {});
	let alwaysAllowExecution = context.globalState.get(JSHINT_ALWAYS_ALLOW_EXECUTION_KEY, false);
	let sessionPath: string | undefined;

	await client.onReady();
	client.onRequest(libraryConfirmationType, async params => {
		if (alwaysAllowExecution) {
			return true;
		}

		sessionPath = params.path;
		const existingConfirmation = libraryConfirmations[params.path];
		if (existingConfirmation !== undefined) {
			return existingConfirmation;
		}

		const libraryUri = Uri.file(params.path);
		const folder = workspace.getWorkspaceFolder(libraryUri);
		let message: string;

		if (folder !== undefined) {
			let relativePath = libraryUri.toString().substr(folder.uri.toString().length + 1);
			const mainPath = '/src/jshint.js';
			if (relativePath.endsWith(mainPath)) {
				relativePath = relativePath.substr(0, relativePath.length - mainPath.length);
			}
			message = `The jshint extension will use '${relativePath}' for validation, which is installed locally in '${folder.name}'. Do you allow the execution of this JSHint version including all plugins and configuration files it will load on your behalf?\n\nPress 'Allow Everywhere' to remember the choice for all workspaces. Use 'Cancel' to disable JSHint for this session.`;
		} else {
			message = params.isGlobal
				? `The jshint extension will use a globally installed jshint library for validation. Do you allow the execution of this JSHint version including all plugins and configuration files it will load on your behalf?\n\nPress 'Allow Everywhere' to remember the choice for all workspaces. Use 'Cancel' to disable JSHint for this session.`
				: `The jshint extension will use a locally installed jshint library for validation. Do you allow the execution of this JSHint version including all plugins and configuration files it will load on your behalf?\n\nPress 'Allow Everywhere' to remember the choice for all workspaces. Use 'Cancel' to disable JSHint for this session.`;
		}

		const item = await window.showInformationMessage(message, { modal: true },
			{ title: 'Allow Everywhere', value: ConfirmationSelection.alwaysAllow },
			{ title: 'Allow', value: ConfirmationSelection.allow },
			{ title: 'Deny', value: ConfirmationSelection.deny },
		);

		if (item === undefined) {
			return false;
		} else {
			switch (item.value) {
				case ConfirmationSelection.alwaysAllow:
					context.globalState.update(JSHINT_ALWAYS_ALLOW_EXECUTION_KEY, true);
					return true;

				case ConfirmationSelection.allow:
					libraryConfirmations[params.path] = true;
					context.globalState.update(JSHINT_LIBRARY_CONFIRMATION_KEY, libraryConfirmations);
					return true;
				
				case ConfirmationSelection.deny:
					libraryConfirmations[params.path] = false;
					context.globalState.update(JSHINT_LIBRARY_CONFIRMATION_KEY, libraryConfirmations);
					return false;
			}
		}
	});
}