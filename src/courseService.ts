// courseService.ts
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import supabase from './supabaseClient';
import { currentUserId } from './extension';

interface CourseRecord {
  id: number;
  name: string;
  folder_path: string;
}

/**
 * 创建新课程：
 * - 在指定父文件夹下以 courseName 为名称创建一个新文件夹，
 * - 在新文件夹内创建 讲义、作业、资料、笔记 四个子文件夹
 * - 将 courseName、folderPath 和当前用户 ID 插入到 Supabase courses 表，返回生成记录的 id 和文件夹路径
 */
export async function createNewCourse(courseName: string): Promise<{ id: number; folderPath: string }> {
  if (!currentUserId) {
    return Promise.reject('未登录，无法创建课程');
  }

  const folderUris = await vscode.window.showOpenDialog({
    canSelectFolders: true,
    canSelectFiles: false,
    openLabel: '选择父文件夹'
  });
  if (!folderUris || folderUris.length === 0) {
    return Promise.reject('未选择父文件夹');
  }
  const parentFolder = folderUris[0].fsPath;
  const courseFolder = path.join(parentFolder, courseName);

  try {
    // 本地文件夹创建
    await fs.promises.mkdir(courseFolder, { recursive: true });
    const subfolders = ['讲义', '作业', '资料', '笔记'];
    for (const sub of subfolders) {
      await fs.promises.mkdir(path.join(courseFolder, sub), { recursive: true });
    }

    // 插入 Supabase
    const { data, error } = await supabase
      .from('courses')
      .insert({
        user_id:    currentUserId,
        name:       courseName,
        folder_path: courseFolder
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Supabase 插入课程失败');
    }

    return { id: data.id, folderPath: courseFolder };
  } catch (err: any) {
    throw new Error(`创建课程失败：${err.message}`);
  }
}

/**
 * 查询所有课程（仅当前用户）：
 * 从 Supabase 读取属于当前用户的所有课程，返回每条记录包含 id、name 和 folder_path 信息
 */
export async function getCourses(): Promise<CourseRecord[]> {
  if (!currentUserId) {
    throw new Error('未登录，无法获取课程列表');
  }
  const { data, error } = await supabase
    .from('courses')
    .select('id, name, folder_path, created_at')
    .eq('user_id', currentUserId);

  if (error) {
    throw new Error(`获取课程列表失败：${error.message}`);
  }
  return data || [];
}

/**
 * 获取指定课程下 讲义/作业/资料/笔记 四个子文件夹的文件列表
 */
export async function getCourseSubfolderFiles(courseName: string): Promise<string[][]> {
  // 先查 Supabase 拿到 folder_path
  const { data: course, error } = await supabase
    .from('courses')
    .select('folder_path')
    .eq('name', courseName)
    .eq('user_id', currentUserId!)
    .single();

  if (error || !course) {
    throw new Error('课程未找到或没有权限');
  }
  const basePath = course.folder_path;
  const subfolders = ['讲义', '作业', '资料', '笔记'];
  const filesArray: string[][] = [];

  for (const sub of subfolders) {
    const subPath = path.join(basePath, sub);
    try {
      filesArray.push(await fs.promises.readdir(subPath));
    } catch {
      filesArray.push([]);
    }
  }
  return filesArray;
}

/**
 * 获取文件详情：大小、类型、上传时间、所在子文件夹
 */
export async function getFileDetails(fullFilePath: string) {
  const [courseName, subfolder, ...rest] = fullFilePath.split('/');
  const filename = rest.join('/');

  // 查 Supabase 拿到课程根路径
  const { data: course, error } = await supabase
    .from('courses')
    .select('folder_path')
    .eq('name', courseName)
    .eq('user_id', currentUserId!)
    .single();

  if (error || !course) {
    throw new Error(`获取课程路径失败：${error?.message}`);
  }

  const absolutePath = path.join(course.folder_path, subfolder, filename);
  const stats = await fs.promises.stat(absolutePath);

  return {
    size:       `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
    type:       path.extname(absolutePath).slice(1).toUpperCase(),
    uploadedAt: stats.mtime.toLocaleString(),
    subfolder,
  };
}

/**
 * 获取文件系统绝对路径
 */
export async function getFileAbsolutePath(fullFilePath: string): Promise<string> {
  const [courseName, subfolder, ...rest] = fullFilePath.split('/');
  const filename = rest.join('/');

  const { data: course, error } = await supabase
    .from('courses')
    .select('folder_path')
    .eq('name', courseName)
    .eq('user_id', currentUserId!)
    .single();

  if (error || !course) {
    throw new Error(`获取课程路径失败：${error?.message}`);
  }
  return path.join(course.folder_path, subfolder, filename);
}
