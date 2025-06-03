// tests/backend/extension.test.ts

// —— 先拿到原生的 fs，确保只改 readFileSync，保留其它方法
const actualFs = jest.requireActual('fs');
jest.mock('fs', () => ({
  ...actualFs,
  readFileSync: jest.fn().mockReturnValue('<html><head></head><body></body></html>')
}));

// —— 关键：正确 mock supabaseClient 模块，保证 testSupabaseConnection 是 jest.fn()
jest.mock('../../src/supabaseClient', () => ({
  __esModule: true,
  default: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: [], error: null })
        })
      })
    })
  },
  testSupabaseConnection: jest.fn().mockResolvedValue(undefined)
}));

// —— 依旧 mock 掉 courseService 的各个导出
jest.mock('../../src/courseService', () => ({
  __esModule: true,
  getCourses: jest.fn().mockResolvedValue([]),
  getCourseSubfolderFiles: jest.fn(),
  getFileDetails: jest.fn(),
  getFileAbsolutePath: jest.fn(),
  createNewCourse: jest.fn()
}));

import * as vscode from 'vscode';
import { activate } from '../../src/extension';
import { testSupabaseConnection } from '../../src/supabaseClient';
import fs from 'fs';

describe('extension.activate (test env)', () => {
  let context: any;
  let callback: Function;

  beforeEach(() => {
    context = {
      subscriptions: [],
      extensionPath: '/ext',
      extensionUri: { fsPath: '/ext' }
    };
    vscode.commands.registerCommand.mockImplementation((cmd, cb) => {
      callback = cb;
      return { dispose: jest.fn() };
    });

    // 把 mock 函数的调用记录清空
    vscode.window.showInformationMessage.mockClear();
    testSupabaseConnection.mockClear();     // 这里就不会报错了
    vscode.window.createWebviewPanel.mockClear();
    (fs as any).readFileSync.mockClear();
  });

  it('registers openWebview command without errors', async () => {
    await activate(context);
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'CourseAwareIDE.openWebview',
      expect.any(Function)
    );
    expect(context.subscriptions).toHaveLength(2);
  });

  it('command callback should run without throwing', async () => {
    await activate(context);
    await expect(callback()).resolves.toBeUndefined();
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('The extension is running!');
    expect(testSupabaseConnection).toHaveBeenCalled();
    expect((fs as any).readFileSync).toHaveBeenCalledWith('\\ext\\dist\\index.html', 'utf8');
    expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
  });
});
