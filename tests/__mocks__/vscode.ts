// tests/__mocks__/vscode.ts
export namespace commands {
  export const registerCommand = jest.fn();
}

export namespace window {
  export const showInformationMessage = jest.fn();
  export const showOpenDialog = jest.fn();
  export const showInputBox = jest.fn();
  export const createWebviewPanel = jest.fn(() => ({
    webview: {
      cspSource: 'MOCK_CSP',
      asWebviewUri: jest.fn(uri => ({ toString: () => `mock://${uri.fsPath}`, path: `/mock/${uri.fsPath}` })),
      html: '',
      onDidReceiveMessage: jest.fn()
    }
  }));  
}

export namespace Uri {
  export const file = jest.fn((path: string) => ({ fsPath: path }));
  export const joinPath = jest.fn((uri: any, ...paths: string[]) => ({ fsPath: [uri.fsPath, ...paths].join('/') }));
}

export enum ViewColumn { One = 1 }
export const workspace = {
  fs: { readFile: jest.fn() }
};
