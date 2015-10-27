/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import {
	ResponseError, RequestType, IRequestHandler, NotificationType, INotificationHandler,
	IValidatorConnection, createValidatorConnection, SingleFileValidator, InitializeResult, InitializeError,
	IValidationRequestor, ISimpleTextDocument, Diagnostic, Severity, Position, Files, FileEvent, FileChangeType,
	LanguageServerError, MessageKind
} from 'vscode-languageserver';

import fs = require('fs');
import path = require('path');

interface Settings {
	jshint: {
		enable: boolean;
		options: any;
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

let workspaceRoot: string = null;
let settings: Settings = null;
let jshintSettings: any = null;
let lib: any = null;
let JSHINTRC = '.jshintrc';

let optionsCache: { [key: string]: any } = Object.create(null);

let connection: IValidatorConnection = createValidatorConnection(process.stdin, process.stdout);
let validator : SingleFileValidator = {
	initialize: (rootFolder: string): Thenable<InitializeResult | ResponseError<InitializeError>> => {
		workspaceRoot = rootFolder;
		return Files.resolveModule(rootFolder, 'jshint').then((value) => {
			if (!value.JSHINT) {
				return new ResponseError(99, 'The jshint library doesn\'t export a JSHINT property.', { retry: false });
			}
			lib = value;
			return null;
		}, (error) => {
			return Promise.reject(
				new ResponseError<InitializeError>(99,
					'Failed to load jshint library. Please install jshint in your workspace folder using \'npm install jshint\' and then press Retry.',
					{ retry: true }));
		});
	},
	onFileEvents(changes: FileEvent[], requestor: IValidationRequestor): void {
		optionsCache = Object.create(null);
		requestor.all();
	},
	onConfigurationChange(_settings: Settings, requestor: IValidationRequestor): void {
		settings = _settings;
		if (settings.jshint) {
			jshintSettings = settings.jshint.options || {};
		}
		optionsCache = Object.create(null);
		requestor.all();
	},
	validate: (document: ISimpleTextDocument): Diagnostic[] => {
		let content = document.getText();
		let JSHINT:JSHINT = lib.JSHINT;

		let fsPath = Files.uriToFilePath(document.uri);
		if (!fsPath) {
			fsPath = workspaceRoot;
		}
		let options = null;
		if (fsPath) {
			options = optionsCache[fsPath];
			if (!options) {
				options = readOptions(fsPath);
				optionsCache[fsPath] = options;
			}
		} else {
			options = optionsCache[''];
			if (!options) {
				options = readOptions(fsPath);
				optionsCache[''] = options;
			}
		}
		options = options || {};
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
		return diagnostics;
	}
};

function makeDiagnostic(problem: JSHintError): Diagnostic {
	return {
		message: problem.reason,
		severity: getSeverity(problem),
		code: problem.code,
		start: {
			line: problem.line - 1,
			character: problem.character - 1
		}
	};
}

function getSeverity(problem: JSHintError): number {
	if (problem.id === '(error)') {
		return Severity.Error;
	}
	return Severity.Warning;
}

function isWindows(): boolean {
	return process.platform === 'win32';
}

function readOptions(fsPath: string = null): any {
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

	function readJsonFile(file: string) {
		try {
			return JSON.parse(stripComments(fs.readFileSync(file).toString()));
		}
		catch (err) {
			throw new LanguageServerError("Can't load JSHint configuration from file " + file + ". Please check the file for syntax errors.", MessageKind.Show);
		}
	}

	function getUserHome() {
		return process.env[isWindows() ? 'USERPROFILE' : 'HOME'];
	}

	if (jshintSettings.config && fs.existsSync(jshintSettings.config)) {
		return readJsonFile(jshintSettings.config);
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
	return jshintSettings;
};

connection.run(validator);