/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
 
import {
	createConnection, IConnection,
	ResponseError, RequestType, IRequestHandler, NotificationType, INotificationHandler,
	InitializeParams, InitializeResult, InitializeError,
	DidChangeConfigurationParams, DidChangeWatchedFilesParams,
	Diagnostic, DiagnosticSeverity, Position, Files,
	TextDocuments, ITextDocument,
	ErrorMessageTracker
} from 'vscode-languageserver';

import fs = require('fs');
import path = require('path');

interface JSHintOptions {
	config?: string;
	[key: string]: any;
}

interface Settings {
	jshint: {
		enable: boolean;
		options: JSHintOptions;
	}
	[key: string]: any;
}

interface JSHintError {
	id: string;
	raw: string;
	code: string;
	line: number;
	character: number;
	scope: string;
	reason: string;
}

interface JSHintUnused {
	name: string;
	line: number;
	character: number;
}

interface JSHintReport {
	options: any;
	errors: JSHintError[];
	unused: JSHintUnused[];
}

interface PackageJSHintConfig {
	jshintConfig: any;
}

interface JSHINT {
	(content: string, options: any, globals: any): void;
	errors: JSHintError[];
}

function makeDiagnostic(problem: JSHintError): Diagnostic {
	return {
		message: problem.reason,
		severity: getSeverity(problem),
		code: problem.code,
		range: {
			start: { line: problem.line - 1, character: problem.character - 1 },
			end: { line: problem.line - 1, character: problem.character - 1 }
		}
	};
}

function getSeverity(problem: JSHintError): number {
	if (problem.id === '(error)') {
		return DiagnosticSeverity.Error;
	}
	return DiagnosticSeverity.Warning;
}

const JSHINTRC = '.jshintrc';
class OptionsResolver {

	private connection: IConnection;
	// These are the settings that come from vscode
	private jshintOptions: JSHintOptions;
	private optionsCache: { [key: string]: any };

	constructor(connection: IConnection) {
		this.connection = connection;
		this.clear();
		this.jshintOptions = null;
	}

	public clear(jshintOptions?: JSHintOptions) {
		this.optionsCache = Object.create(null);
		if (jshintOptions) {
			this.jshintOptions = jshintOptions;
		}
	}

	public getOptions(fsPath: string): any {
		let result = this.optionsCache[fsPath];
		if (!result) {
			result = this.readOptions(fsPath);
			this.optionsCache[fsPath] = result;
		}
		return result;
	}

	private readOptions(fsPath: string = null): any {
		let that = this;
		function locateFile(directory: string, fileName: string) {
			let parent = directory;
			do {
				directory = parent;
				let location = path.join(directory, fileName);
				if (fs.existsSync(location)) {
					return location;
				}
				parent = path.dirname(directory);
			} while (parent !== directory);
			return undefined;
		};

		function stripComments(content: string): string {
			/**
			* First capturing group mathes double quoted string
			* Second matches singler quotes string
			* Thrid matches block comments
			* Fourth matches line comments
			*/
			var regexp: RegExp = /("(?:[^\\\"]*(?:\\.)?)*")|('(?:[^\\\']*(?:\\.)?)*')|(\/\*(?:\r?\n|.)*?\*\/)|(\/{2,}.*?(?:(?:\r?\n)|$))/g;
			let result = content.replace(regexp, (match, m1, m2, m3, m4) => {
				// Only one of m1, m2, m3, m4 matches
				if (m3) {
					// A block comment. Replace with nothing
					return "";
				} else if (m4) {
					// A line comment. If it ends in \r?\n then keep it.
					let length = m4.length;
					if (length > 2 && m4[length - 1] === '\n') {
						return m4[length - 2] === '\r' ? '\r\n': '\n';
					} else {
						return "";
					}
				} else {
					// We match a string
					return match;
				}
			});
			return result;
		};

		function readJsonFile(file: string): any {
			try {
				return JSON.parse(stripComments(fs.readFileSync(file).toString()));
			}
			catch (err) {
				that.connection.window.showErrorMessage(`Can't load JSHint configuration from file ${file}. Please check the file for syntax errors.`);
				return {};
			}
		}

		function isWindows(): boolean {
			return process.platform === 'win32';
		}

		function getUserHome() {
			return process.env[isWindows() ? 'USERPROFILE' : 'HOME'];
		}

		let jshintOptions = this.jshintOptions;
		if (jshintOptions && jshintOptions.config && fs.existsSync(jshintOptions.config)) {
			return readJsonFile(jshintOptions.config);
		}

		if (fsPath) {
			let packageFile = locateFile(fsPath, 'package.json');
			if (packageFile) {
				let content = readJsonFile(packageFile);
				if (content.jshintConfig) {
					return content.jshintConfig;
				}
			}

			let configFile = locateFile(fsPath, JSHINTRC);
			if (configFile) {
				return readJsonFile(configFile);
			}
		}

		let home = getUserHome();
		if (home) {
			let file = path.join(home, JSHINTRC);
			if (fs.existsSync(file)) {
				return readJsonFile(file);
			}
		}
		return jshintOptions;
	}
}

class Linter {

	private connection: IConnection;
	private options: OptionsResolver;
	private documents: TextDocuments;

	private workspaceRoot: string;
	private lib: any;

	constructor() {
		this.connection = createConnection(process.stdin, process.stdout);
		this.options = new OptionsResolver(this.connection);
		this.documents = new TextDocuments();
		this.documents.onDidChangeContent(event => this.validateSingle(event.document));
		this.documents.listen(this.connection);

		this.connection.onInitialize(params => this.onInitialize(params));
		this.connection.onDidChangeConfiguration(params => {
			let jshintOptions = (<Settings>params.settings).jshint ? (<Settings>params.settings).jshint.options : {};
			this.options.clear(jshintOptions);
			this.validateAll();
		});
		this.connection.onDidChangeWatchedFiles(params => {
			this.options.clear();
			this.validateAll();
		})
	}

	public listen(): void {
		this.connection.listen();
	}

	private onInitialize(params: InitializeParams): Thenable<InitializeResult | ResponseError<InitializeError>> {
		this.workspaceRoot = params.rootPath;
		return Files.resolveModule(this.workspaceRoot, 'jshint').then((value) => {
			if (!value.JSHINT) {
				return new ResponseError(99, 'The jshint library doesn\'t export a JSHINT property.', { retry: false });
			}
			this.lib = value;
			let result: InitializeResult = { capabilities: { textDocumentSync: this.documents.syncKind }};
			return result;
		}, (error) => {
			return Promise.reject(
				new ResponseError<InitializeError>(99,
					'Failed to load jshint library. Please install jshint in your workspace folder using \'npm install jshint\' or globally using \'npm install -g jshint\' and then press Retry.',
					{ retry: true }));
		});
	}

	private validateAll(): void {
		let tracker = new ErrorMessageTracker();
		this.documents.all().forEach(document => {
			try {
				this.validate(document);
			} catch (err) {
				tracker.add(this.getMessage(err, document));
			}
		});
		tracker.sendErrors(this.connection);
	}

	private validateSingle(document: ITextDocument): void {
		try {
			this.validate(document);
		} catch (err) {
			this.connection.window.showErrorMessage(this.getMessage(err, document));
		}
	}

	private validate(document: ITextDocument) {
		let content = document.getText();
		let JSHINT:JSHINT = this.lib.JSHINT;

		let fsPath = Files.uriToFilePath(document.uri);
		if (!fsPath) {
			fsPath = this.workspaceRoot;
		}
		let options = this.options.getOptions(fsPath) || {};
		JSHINT(content, options, options.globals || {});
		let diagnostics: Diagnostic[] = [];
		let errors: JSHintError[] = JSHINT.errors;
		if (errors) {
			errors.forEach((error) => {
				// For some reason the errors array contains null.
				if (error) {
					diagnostics.push(makeDiagnostic(error));
				}
			});
		}
		this.connection.sendDiagnostics({ uri: document.uri, diagnostics });
	}

	private getMessage(err: any, document: ITextDocument): string {
		let result: string = null;
		if (typeof err.message === 'string' || err.message instanceof String) {
			result = <string>err.message;
		} else {
			result = `An unknown error occured while validating file: ${Files.uriToFilePath(document.uri)}`;
		}
		return result;
	}
}

new Linter().listen();