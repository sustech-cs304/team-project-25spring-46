// tests/backend/extension.test.ts

// ====== Manual mocks must be BEFORE any imports ======
// Mock fs.readFileSync to avoid real file I/O
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn().mockReturnValue('<html><head></head><body></body></html>'),
  readFile: jest.fn((path, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
    }
    process.nextTick(() => callback(null, Buffer.from('mock file content')));
  }),
}));
// Mock database to prevent real DB connection
jest.mock('../../src/database', () => ({
  __esModule: true,
  default: { query: jest.fn().mockResolvedValue({ rows: [] }) }
}));
// Mock supabaseClient to prevent IIFE and real network
jest.mock('../../src/supabaseClient', () => ({
  __esModule: true,
  default: { from: jest.fn().mockReturnValue({ select: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) },
  testSupabaseConnection: jest.fn().mockResolvedValue(undefined)
}));

import * as vscode from 'vscode';
import { activate } from '../../src/extension';
import { testSupabaseConnection } from '../../src/supabaseClient';

// vscode mock provided via moduleNameMapper (__mocks__/vscode.ts)

describe('extension.activate', () => {
  let context: any;
  let callback: Function;

  beforeEach(() => {
    context = { 
      subscriptions: [], 
      extensionPath: '/ext', 
      extensionUri: { fsPath: '/ext' },
      globalState: {
        get: jest.fn().mockReturnValue(null),
        update: jest.fn()
      } 
    };
    // registerCommand should return a disposable; callback is 2nd arg
    (vscode.commands.registerCommand as jest.Mock).mockImplementation((cmd, cb) => {
      callback = cb as Function;
      return { dispose: jest.fn() };
    });
    // Clear mocks
    (vscode.window.showInformationMessage as jest.Mock).mockClear();
    (testSupabaseConnection as jest.Mock).mockClear();
    (vscode.window.createWebviewPanel as jest.Mock).mockClear();
  });

  it('registers openWebview command', async () => {
    await activate(context);
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'CourseAwareIDE.openWebview',
      expect.any(Function)
    );
    expect(context.subscriptions).toHaveLength(2);
    expect(context.subscriptions.some(s => typeof s.dispose === 'function')).toBe(true);
  });

  it('command callback calls showInformationMessage and supabase test and reads html', async () => {
    await activate(context);
    // invoke the saved callback to simulate command execution
    await callback();
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('The extension is running!');
    expect(testSupabaseConnection).toHaveBeenCalled();
    // fs.readFileSync was mocked to return dummy html
    expect(require('fs').readFileSync).toHaveBeenCalledWith('\\ext\\dist\\index.html', 'utf8');
    // createWebviewPanel should have been called
    expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
  });
});
