"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspace = exports.ViewColumn = exports.Uri = exports.window = exports.commands = void 0;
// tests/__mocks__/vscode.ts
var commands;
(function (commands) {
    commands.registerCommand = jest.fn();
})(commands || (exports.commands = commands = {}));
var window;
(function (window) {
    window.showInformationMessage = jest.fn();
    window.showOpenDialog = jest.fn();
    window.showInputBox = jest.fn();
    window.createWebviewPanel = jest.fn(() => ({
        webview: {
            cspSource: 'MOCK_CSP',
            asWebviewUri: jest.fn(uri => ({ toString: () => `mock://${uri.fsPath}`, path: `/mock/${uri.fsPath}` })),
            html: '',
            onDidReceiveMessage: jest.fn()
        }
    }));
})(window || (exports.window = window = {}));
var Uri;
(function (Uri) {
    Uri.file = jest.fn((path) => ({ fsPath: path }));
    Uri.joinPath = jest.fn((uri, ...paths) => ({ fsPath: [uri.fsPath, ...paths].join('/') }));
})(Uri || (exports.Uri = Uri = {}));
var ViewColumn;
(function (ViewColumn) {
    ViewColumn[ViewColumn["One"] = 1] = "One";
})(ViewColumn || (exports.ViewColumn = ViewColumn = {}));
exports.workspace = {
    fs: { readFile: jest.fn() }
};
//# sourceMappingURL=vscode.js.map