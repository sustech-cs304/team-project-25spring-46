"use strict";
// tests/backend/extension.test.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// ====== Manual mocks must be BEFORE any imports ======
// Mock fs.readFileSync to avoid real file I/O
jest.mock('fs', () => ({
    readFileSync: jest.fn().mockReturnValue('<html><head></head><body></body></html>')
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
const vscode = __importStar(require("vscode"));
const extension_1 = require("../../src/extension");
const supabaseClient_1 = require("../../src/supabaseClient");
// vscode mock provided via moduleNameMapper (__mocks__/vscode.ts)
describe('extension.activate', () => {
    let context;
    let callback;
    beforeEach(() => {
        context = { subscriptions: [], extensionPath: '/ext', extensionUri: { fsPath: '/ext' } };
        // registerCommand should return a disposable; callback is 2nd arg
        vscode.commands.registerCommand.mockImplementation((cmd, cb) => {
            callback = cb;
            return { dispose: jest.fn() };
        });
        // Clear mocks
        vscode.window.showInformationMessage.mockClear();
        supabaseClient_1.testSupabaseConnection.mockClear();
        vscode.window.createWebviewPanel.mockClear();
    });
    it('registers openWebview command', async () => {
        await (0, extension_1.activate)(context);
        expect(vscode.commands.registerCommand).toHaveBeenCalledWith('CourseAwareIDE.openWebview', expect.any(Function));
        expect(context.subscriptions).toHaveLength(1);
    });
    it('command callback calls showInformationMessage and supabase test and reads html', async () => {
        await (0, extension_1.activate)(context);
        // invoke the saved callback to simulate command execution
        await callback();
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('The extension is running!');
        expect(supabaseClient_1.testSupabaseConnection).toHaveBeenCalled();
        // fs.readFileSync was mocked to return dummy html
        expect(require('fs').readFileSync).toHaveBeenCalledWith('\\ext\\dist\\index.html', 'utf8');
        // createWebviewPanel should have been called
        expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
    });
});
//# sourceMappingURL=extension.test.js.map