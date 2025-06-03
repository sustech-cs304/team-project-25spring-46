// tests/backend/courseService.test.ts

import * as courseService from '../../src/courseService';
import * as fs from 'fs';
import * as path from 'path';

describe('courseService (test env)', () => {
  beforeAll(() => {
    // 确保 NODE_ENV 已设为 'test'
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('getCourses 在测试环境返回固定列表', async () => {
    const res = await courseService.getCourses();
    expect(res).toEqual([
      { id: 1, name: 'TestCourse', folder_path: '/tmp/TestCourse' }
    ]);
  });

  it('getCourseSubfolderFiles 在测试环境返回四个空数组', async () => {
    const lists = await courseService.getCourseSubfolderFiles('anyName');
    expect(lists).toEqual([ [], [], [], [] ]);
  });

  it('getFileDetails 在测试环境返回虚拟元数据', async () => {
    const details = await courseService.getFileDetails('any/sub/file.txt');
    expect(details).toHaveProperty('size', '0.00 MB');
    expect(details).toHaveProperty('type', 'TXT');
    expect(details).toHaveProperty('uploadedAt');
    expect(details).toHaveProperty('subfolder', '测试子文件夹');
  });

  it('getFileAbsolutePath 在测试环境返回 /tmp/dummy.pdf', async () => {
    const p = await courseService.getFileAbsolutePath('any/sub/file');
    expect(p).toBe('/tmp/dummy.pdf');
  });

  it('createNewCourse 在测试环境直接返回固定值', async () => {
    const { id, folderPath } = await courseService.createNewCourse('HelloCourse');
    expect(id).toBe(1);
    expect(folderPath).toBe('/tmp/HelloCourse');
  });
});
