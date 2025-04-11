import * as vscode from 'vscode';

export function showErrorMessage(message: string) {
  vscode.window.showErrorMessage(message);
}

export function showInformationMessage(message: string) {
  vscode.window.showInformationMessage(message);
}

export function showQuickPick(options: string[], placeHolder: string): Thenable<string | undefined> {
  return vscode.window.showQuickPick(options, { placeHolder });
}