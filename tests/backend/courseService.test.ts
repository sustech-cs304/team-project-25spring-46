// tests/backend/courseService.test.ts

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: {
      mkdir: jest.fn().mockResolvedValue(undefined),
      readdir: jest.fn().mockResolvedValue(['f1','f2']),
      stat: jest.fn().mockResolvedValue({ size: 1024*1024, mtime: new Date('2020-01-01') })
    }
  };
});
jest.mock('../../src/database', () => ({
  __esModule: true,
  default: { query: jest.fn() }
}));

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import pool from '../../src/database';
import {
  createNewCourse,
  getCourses,
  getCourseSubfolderFiles,
  getFileDetails,
  getFileAbsolutePath
} from '../../src/courseService';


describe('courseService', () => {
  beforeEach(() => {
    (pool.query as jest.Mock).mockClear();
    (fs.promises.mkdir as jest.Mock).mockClear();
    (fs.promises.readdir as jest.Mock).mockClear();
    (fs.promises.stat as jest.Mock).mockClear();
  });

  it('getCourses returns rows', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id:1,name:'n',folder_path:'/f'}] });
    const res = await getCourses();
    expect(res).toEqual([{ id:1,name:'n',folder_path:'/f'}]);
  });

  it('getCourseSubfolderFiles returns 4 arrays', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows:[{ folder_path:'/base' }] });
    const lists = await getCourseSubfolderFiles('c');
    expect(fs.promises.readdir).toHaveBeenCalledTimes(4);
    expect(lists).toEqual([['f1','f2'],['f1','f2'],['f1','f2'],['f1','f2']]);
  });

  it('getFileDetails returns metadata', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows:[{ folder_path:'/base' }] });
    const details = await getFileDetails('c/s/file.txt');
    expect(fs.promises.stat).toHaveBeenCalled();
    expect(details.type).toBe('TXT');
    expect(details.size).toBe('1.00 MB');
    expect(details.subfolder).toBe('s');
  });

  it('getFileAbsolutePath resolves path', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows:[{ folder_path:'/base' }] });
    const p = await getFileAbsolutePath('c/s/file');
    expect(p).toBe(path.join('/base','s','file'));
  });

  it('createNewCourse rejects when no folder selected', async () => {
    (vscode.window.showOpenDialog as jest.Mock).mockResolvedValue([]);
    await expect(createNewCourse('n')).rejects.toBe('未选择父文件夹');
  });
});
