// tests/backend/commentService.test.ts

// 定义统一 mock 路径（全局）
const mockProjectRoot = '/mock/project/root';
const mockFilePath = 'test/path/file.txt';
let mockAbsolutePath: string;
let mockSupabase: any;

// jest.mock('fs', () => ({
//     ...jest.requireActual('fs'),
//     promises: {
//     readFile: jest.fn().mockResolvedValue(Buffer.from('mock file content'))
//     }
// }));
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFile: jest.fn((path, options, callback) => {
    // 兼容没有传options的情况
    if (typeof options === 'function') {
        callback = options;
    }
    // 模拟异步调用 callback(null, data)
    process.nextTick(() => callback(null, Buffer.from('mock file content')));
    }),
}));

jest.mock('../../src/supabaseClient', () => ({
    __esModule: true,
    default: {},
    testSupabaseConnection: jest.fn()
}));

jest.mock('../../src/courseService', () => ({
  getFileAbsolutePath: jest.fn()
}));

jest.mock('crypto', () => ({
    subtle: {
    digest: jest.fn().mockResolvedValue(new Uint8Array(32).fill(0x12)) // 填满0x12作为hash输出
    }
}));

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { 
    addComment,
    deleteCommentById,
    deleteCommentByFile,
    getAllComments,
    getPageComments,
    hashFileByContent,
    hashFilePath,
    parsePosition
} from '../../src/commentService';
import supabase from '../../src/supabaseClient';
import { getFileAbsolutePath } from '../../src/courseService';

beforeEach(() => {
    mockAbsolutePath = path.join(mockProjectRoot, mockFilePath);
    (getFileAbsolutePath as jest.Mock).mockResolvedValue(mockAbsolutePath);

    mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockResolvedValue({
                data: [{ id: 1, content: 'test comment' }],
                error: null
            })
        })),
        insert: jest.fn().mockReturnThis(),
        delete: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockResolvedValue({ error: null }) // 默认返回成功
        })),
        order: jest.fn().mockReturnThis()
    };
    const supabaseModule = require('../../src/supabaseClient');
    supabaseModule.default = mockSupabase;
});

describe('commentService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (supabase.from as jest.Mock).mockImplementation(() => supabase);
    });

    describe('parsePosition', () => {
        it('should parse valid position string', () => {
            const result = parsePosition('{"x":10,"y":20}');
            expect(result).toEqual({ x: 10, y: 20 });
        });

        it('should return default for invalid position string', () => {
            // 创建console.warn的mock
            const consoleWarnMock = jest.spyOn(console, 'warn').mockImplementation(() => {});
            const result = parsePosition('invalid json');
            expect(consoleWarnMock).toHaveBeenCalledWith('无法解析 position: invalid json');
            consoleWarnMock.mockRestore();
        });

        it('should return default for null/undefined', () => {
            expect(parsePosition(null)).toEqual({ x: 0, y: 0 });
            expect(parsePosition(undefined)).toEqual({ x: 0, y: 0 });
        });
    });
        
    describe('hashFileByContent', () => {
        beforeEach(() => {
            (fs.readFile as unknown as jest.Mock).mockImplementation((path, options, callback) => {
                if (typeof options === 'function') {
                callback = options;
                }
                process.nextTick(() => callback(null, Buffer.from('consistent test content')));
            });

            jest.spyOn(crypto.subtle, 'digest').mockImplementation(async () => {
                // 返回一个长度为32的 ArrayBuffer（比如填充0x12）
                const buffer = new ArrayBuffer(32);
                const uint8 = new Uint8Array(buffer);
                uint8.fill(0x12);
                return buffer;
            });
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should use mocked path and content', async () => {
            const hash = await hashFileByContent(mockFilePath);

            expect(getFileAbsolutePath).toHaveBeenCalledWith(mockFilePath);
            expect(fs.readFile).toHaveBeenCalledWith(mockAbsolutePath, expect.any(Function));
            expect(typeof hash).toBe('string');
            expect(hash.length).toBe(64); // SHA-256 输出的 hex 长度
        });

        it('should correctly hash file content', async () => {
            const hash = await hashFileByContent(mockFilePath);

            expect(getFileAbsolutePath).toHaveBeenCalledWith(mockFilePath);
            expect(fs.readFile).toHaveBeenCalledWith(mockAbsolutePath, expect.any(Function));
            expect(crypto.subtle.digest).toHaveBeenCalled();

            // 验证 hash 是字符串并具有预期长度
            expect(typeof hash).toBe('string');
            expect(hash.length).toBe(64);
        });

        it('should throw error when file reading fails', async () => {
            (fs.readFile as unknown as jest.Mock).mockImplementation((path, options, callback) => {
                if (typeof options === 'function') {
                callback = options;
                }
                process.nextTick(() => callback(new Error('File read error')));
            });
        
            await expect(hashFileByContent(mockFilePath)).rejects.toThrow('File read error');
        });
    });

    describe('addComment', () => {
        beforeEach(() => {
            (fs.readFile as unknown as jest.Mock).mockImplementation((path, options, callback) => {
                if (typeof options === 'function') {
                callback = options;
                }
                process.nextTick(() => callback(null, Buffer.from('consistent test content')));
            });

            jest.spyOn(crypto.subtle, 'digest').mockImplementation(async () => {
                const buffer = new ArrayBuffer(32);
                const uint8 = new Uint8Array(buffer);
                uint8.fill(0x12);
                return buffer;
            });
        });
        
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should add text comment successfully', async () => {
            mockSupabase.insert.mockResolvedValueOnce({ error: null });
            
            await addComment({
            filePath: 'test.pdf',
            type: 'text',
            x1: 10,
            y1: 20,
            content: 'test comment',
            author: 'user1'
            });

            expect(mockSupabase.from).toHaveBeenCalledWith('comments');
            expect(mockSupabase.insert).toHaveBeenCalled();
        });

        it('should add highlight comment successfully', async () => {
            mockSupabase.insert.mockResolvedValueOnce({ error: null });
            
            await addComment({
            filePath: 'test.pdf',
            type: 'highlight',
            x1: 10,
            y1: 20,
            width: 100,
            height: 50,
            content: 'highlight'
            });

            expect(mockSupabase.from).toHaveBeenCalledWith('comments');
            expect(mockSupabase.insert).toHaveBeenCalled();
        });

        it('should throw error when insert fails', async () => {
            mockSupabase.insert.mockResolvedValueOnce({ 
            error: { message: 'insert error' } 
            });
            
            await expect(addComment({
            filePath: 'test.pdf',
            type: 'text',
            content: 'test'
            })).rejects.toThrow('添加评论失败: insert error');
        });
    });

    describe('deleteCommentById', () => {
        beforeEach(() => {
            // 统一 mock 链式调用
            const mockEq = jest.fn().mockResolvedValue({ error: null });
            const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
            (mockSupabase.from as jest.Mock).mockReturnValue({ delete: mockDelete });
        });
    
        afterEach(() => {
            jest.clearAllMocks();
            jest.restoreAllMocks();
        });

        it('should delete comment successfully', async () => {            
            const result = await deleteCommentById(1);
            expect(result).toBeUndefined(); // 成功返回 undefined
            
            expect(mockSupabase.from).toHaveBeenCalledWith('comments');
            expect(mockSupabase.from().delete).toHaveBeenCalled();
            expect(mockSupabase.from().delete().eq).toHaveBeenCalledWith('id', 1);
        });

        it('should throw error when delete fails', async () => {
            const mockEq = jest.fn().mockResolvedValue({ error: { message: 'delete error' } });
            const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
            (mockSupabase.from as jest.Mock).mockReturnValue({ delete: mockDelete });

            await expect(deleteCommentById(1)).rejects.toThrow('删除评论失败: delete error');

            // 重新 mock 使 eq 返回错误
            expect(mockSupabase.from).toHaveBeenCalledWith('comments');
            expect(mockSupabase.from().delete).toHaveBeenCalled();
            expect(mockSupabase.from().delete().eq).toHaveBeenCalledWith('id', 1);
        });
    });

    describe('deleteCommentByFile', () => {
        beforeEach(() => {
            (fs.readFile as unknown as jest.Mock).mockImplementation((path, options, callback) => {
                if (typeof options === 'function') {
                callback = options;
                }
                process.nextTick(() => callback(null, Buffer.from('consistent test content')));
            });

            jest.spyOn(crypto.subtle, 'digest').mockImplementation(async () => {
                const buffer = new ArrayBuffer(32);
                const uint8 = new Uint8Array(buffer);
                uint8.fill(0x12);
                return buffer;
            });

            // 统一 mockSupabase 链式调用结构
            const mockEq = jest.fn().mockResolvedValue({ error: null });
            const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
            (mockSupabase.from as jest.Mock).mockReturnValue({ delete: mockDelete });
        });
        
        afterEach(() => {
            jest.restoreAllMocks();
            jest.clearAllMocks();
        });

        it('should delete comments by file successfully', async () => {            
            const result = await deleteCommentByFile('test.pdf');
            expect(result).toBeUndefined(); // 成功返回 undefined

            expect(mockSupabase.from).toHaveBeenCalledWith('comments');
            expect(mockSupabase.from().delete).toHaveBeenCalled();
            expect(mockSupabase.from().delete().eq).toHaveBeenCalledWith('file_id', expect.any(String));
        });

        it('should throw error when delete fails', async () => {
            // 重新 mock 使 eq 返回错误
            const mockEq = jest.fn().mockResolvedValue({ error: { message: 'delete error' } });
            const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
            (mockSupabase.from as jest.Mock).mockReturnValue({ delete: mockDelete });

            await expect(deleteCommentByFile('test.pdf')).rejects.toThrow('删除评论失败: delete error');

            expect(mockSupabase.from).toHaveBeenCalledWith('comments');
            expect(mockSupabase.from().delete).toHaveBeenCalled();
            expect(mockSupabase.from().delete().eq).toHaveBeenCalledWith('file_id', expect.any(String));
        });
    });

    describe('getAllComments', () => {
        beforeEach(() => {
            (fs.readFile as unknown as jest.Mock).mockImplementation((path, options, callback) => {
                if (typeof options === 'function') {
                callback = options;
                }
                process.nextTick(() => callback(null, Buffer.from('consistent test content')));
            });

            jest.spyOn(crypto.subtle, 'digest').mockImplementation(async () => {
                const buffer = new ArrayBuffer(32);
                const uint8 = new Uint8Array(buffer);
                uint8.fill(0x12);
                return buffer;
            });
        });
        
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return all comments for file', async () => {
            const mockComments = [{
            id: 1,
            file_id: 'hash',
            page_number: 1,
            type: 'text',
            content: 'test',
            author: 'user1',
            created_at: '2023-01-01',
            position: '{"x":10,"y":20}'
            }];
            
            const mockEq = jest.fn().mockResolvedValue({
                data: mockComments,
                error: null
            });
    
            (mockSupabase.select as jest.Mock).mockImplementationOnce(() => ({
                eq: mockEq
            }));
            
            const result = await getAllComments('test.pdf');
            expect(result).toEqual([{
            id: '1',
            page: 1,
            type: 'text',
            content: 'test',
            author: 'user1',
            time: '2023-01-01',
            position: { x: 10, y: 20 }
            }]);

            // 验证链式调用参数
            expect(mockSupabase.from).toHaveBeenCalledWith('comments');
            expect(mockSupabase.select).toHaveBeenCalledWith('*');
            expect(mockEq).toHaveBeenCalledWith('file_id', expect.any(String));
        });

        it('should throw error when query fails', async () => {
            const mockEq = jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'query error' }
            });
    
            (mockSupabase.select as jest.Mock).mockImplementationOnce(() => ({
                eq: mockEq
            }));
    
            await expect(getAllComments('test.pdf')).rejects.toThrow('获取评论失败: query error');
    
            expect(mockSupabase.from).toHaveBeenCalledWith('comments');
            expect(mockSupabase.select).toHaveBeenCalledWith('*');
            expect(mockEq).toHaveBeenCalledWith('file_id', expect.any(String));
        });
    });

    describe('getPageComments', () => {
        beforeEach(() => {
            (fs.readFile as unknown as jest.Mock).mockImplementation((path, options, callback) => {
                if (typeof options === 'function') {
                callback = options;
                }
                process.nextTick(() => callback(null, Buffer.from('consistent test content')));
            });

            jest.spyOn(crypto.subtle, 'digest').mockImplementation(async () => {
                const buffer = new ArrayBuffer(32);
                const uint8 = new Uint8Array(buffer);
                uint8.fill(0x12);
                return buffer;
            });
        });
        
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return page comments for file', async () => {
            const mockComments = [{
            id: 1,
            file_id: 'hash',
            page_number: 2,
            type: 'highlight',
            content: 'important',
            author: 'user2',
            created_at: '2023-01-02',
            position: '{"x":30,"y":40,"width":100,"height":50}'
            }];
            
            const mockEqSecond = jest.fn().mockResolvedValue({
                data: mockComments,
                error: null
            });
    
            const mockEqFirst = jest.fn().mockReturnValue({
                eq: mockEqSecond
            });
    
            (mockSupabase.select as jest.Mock).mockImplementationOnce(() => ({
                eq: mockEqFirst
            }));
            
            const result = await getPageComments('test.pdf', 2);
            expect(result).toEqual([{
            id: '1',
            page: 2,
            type: 'highlight',
            content: 'important',
            author: 'user2',
            time: '2023-01-02',
            position: { x: 30, y: 40, width: 100, height: 50 }
            }]);

             // 验证链式调用是否被正确触发
            expect(mockSupabase.from).toHaveBeenCalledWith('comments');
            expect(mockSupabase.select).toHaveBeenCalledWith('*');
            expect(mockEqFirst).toHaveBeenCalledWith('file_id', '1212121212121212121212121212121212121212121212121212121212121212');
            expect(mockEqSecond).toHaveBeenCalledWith('page_number', 2);
        });
    });
});