"use strict";
// tests/backend/courseService.test.ts
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('fs', () => {
    const actual = jest.requireActual('fs');
    return {
        ...actual,
        promises: {
            mkdir: jest.fn().mockResolvedValue(undefined),
            readdir: jest.fn().mockResolvedValue(['f1', 'f2']),
            stat: jest.fn().mockResolvedValue({ size: 1024 * 1024, mtime: new Date('2020-01-01') })
        }
    };
});
jest.mock('../../src/database', () => ({
    __esModule: true,
    default: { query: jest.fn() }
}));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const database_1 = __importDefault(require("../../src/database"));
const courseService_1 = require("../../src/courseService");
describe('courseService', () => {
    beforeEach(() => {
        database_1.default.query.mockClear();
        fs.promises.mkdir.mockClear();
        fs.promises.readdir.mockClear();
        fs.promises.stat.mockClear();
    });
    it('getCourses returns rows', async () => {
        database_1.default.query.mockResolvedValue({ rows: [{ id: 1, name: 'n', folder_path: '/f' }] });
        const res = await (0, courseService_1.getCourses)();
        expect(res).toEqual([{ id: 1, name: 'n', folder_path: '/f' }]);
    });
    it('getCourseSubfolderFiles returns 4 arrays', async () => {
        database_1.default.query.mockResolvedValue({ rows: [{ folder_path: '/base' }] });
        const lists = await (0, courseService_1.getCourseSubfolderFiles)('c');
        expect(fs.promises.readdir).toHaveBeenCalledTimes(4);
        expect(lists).toEqual([['f1', 'f2'], ['f1', 'f2'], ['f1', 'f2'], ['f1', 'f2']]);
    });
    it('getFileDetails returns metadata', async () => {
        database_1.default.query.mockResolvedValue({ rows: [{ folder_path: '/base' }] });
        const details = await (0, courseService_1.getFileDetails)('c/s/file.txt');
        expect(fs.promises.stat).toHaveBeenCalled();
        expect(details.type).toBe('TXT');
        expect(details.size).toBe('1.00 MB');
        expect(details.subfolder).toBe('s');
    });
    it('getFileAbsolutePath resolves path', async () => {
        database_1.default.query.mockResolvedValue({ rows: [{ folder_path: '/base' }] });
        const p = await (0, courseService_1.getFileAbsolutePath)('c/s/file');
        expect(p).toBe(path.join('/base', 's', 'file'));
    });
    it('createNewCourse rejects when no folder selected', async () => {
        vscode.window.showOpenDialog.mockResolvedValue([]);
        await expect((0, courseService_1.createNewCourse)('n')).rejects.toBe('未选择父文件夹');
    });
});
//# sourceMappingURL=courseService.test.js.map