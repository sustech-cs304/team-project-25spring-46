// courseService.ts
import * as fs from 'fs';
import * as path from 'path';
import pool from './database';
import * as vscode from 'vscode';

/**
 * 创建新课程：
 * - 在指定父文件夹下以 courseName 为名称创建一个新文件夹，
 * - 在新文件夹内创建 讲义、作业、资料、笔记 四个子文件夹
 * - 将课程名称和文件夹路径保存到数据库中，并返回生成记录的 id 和文件夹路径
 */
export async function createNewCourse(courseName: string): Promise<{ id: number; folderPath: string }> {
  const folderUris = await vscode.window.showOpenDialog({
    canSelectFolders: true,
    canSelectFiles: false,
    openLabel: '选择父文件夹'
  });
  if (!folderUris || folderUris.length === 0) {
    console.error('未选择父文件夹');
    return Promise.reject('未选择父文件夹');
  }
  const parentFolder = folderUris[0].fsPath;
  let courseFolder = path.join(parentFolder, courseName);
  try {
    // 创建课程文件夹（如果不存在则递归创建）
    await fs.promises.mkdir(courseFolder, { recursive: true });
    
    // 定义需要创建的四个子文件夹名称
    const subfolders = ['讲义', '作业', '资料', '笔记'];
    for (const sub of subfolders) {
      const subFolderPath = path.join(courseFolder, sub);
      await fs.promises.mkdir(subFolderPath, { recursive: true });
    }
    
    // 将课程数据插入数据库
    const queryText = 'INSERT INTO courses(name, folder_path) VALUES($1, $2) RETURNING id';
    const values = [courseName, courseFolder];
    const result = await pool.query(queryText, values);
    const id = result.rows[0].id;
    
    return { id, folderPath: courseFolder };
  } catch (error) {
    throw new Error(`创建课程失败：${error}, courseFolder: ${courseFolder}, courseName: ${courseName}`);
  }
}

/**
 * 查询所有课程：
 * 从数据库中读取所有课程，返回每条记录包含 id、name 和 folder_path 信息
 */
export async function getCourses(): Promise<{ id: number; name: string; folder_path: string }[]> {
  try {
    const queryText = 'SELECT id, name, folder_path FROM courses';
    const result = await pool.query(queryText);
    return result.rows;
  } catch (error) {
    throw new Error(`获取课程列表失败：${error}`);
  }
}

// 获取课程下每个子文件夹的文件列表
export async function getCourseSubfolderFiles(courseName: string): Promise<string[][]> {
    const subfolders = ['讲义', '作业', '资料', '笔记'];
    const courseRes = await pool.query('SELECT folder_path FROM courses WHERE name = $1', [courseName]);
    if (courseRes.rows.length === 0) {throw new Error('课程未找到');}
  
    const coursePath = courseRes.rows[0].folder_path;
    const filesArray: string[][] = [];
  
    for (const sub of subfolders) {
      const subPath = path.join(coursePath, sub);
      let files: string[] = [];
      try {
        files = await fs.promises.readdir(subPath);
      } catch (err) {
        console.error(`读取子文件夹失败: ${subPath}`);
      }
      filesArray.push(files);
    }
  
    return filesArray; // 返回4个子文件夹下的文件列表
}

export async function getFileDetails(fullFilePath: string) {
  console.log("getFileDetails - now checking file stats: ", fullFilePath);
  // fullFilePath = path.join(context.extensionPath, fullFilePath);
  const parts = fullFilePath.split("/");
  const courseName = parts[0];
  const subfolder = parts[1];
  const filename = parts.slice(2).join("/");
  try {
    const res = await pool.query("SELECT folder_path FROM courses WHERE name = $1", [courseName]);
    console.log("数据库返回结果:", res.rows);
    const coursePath = res.rows[0].folder_path;
    const absolutePath = path.join(coursePath, subfolder, filename);
    const stats = await fs.promises.stat(absolutePath);
    return {
      size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
      type: path.extname(absolutePath).slice(1).toUpperCase(),
      uploadedAt: stats.mtime.toLocaleString(),
      subfolder: subfolder,
    };
  }
  catch (error) {
    console.error("获取文件详情失败: ", error);
    throw new Error(`获取文件详情失败: ${error}`);
  }
}

export async function getFileAbsolutePath(fullFilePath: string) {
  console.log("getFileAbsolutePath - now checking file stats: ", fullFilePath);
  // fullFilePath = path.join(context.extensionPath, fullFilePath);
  const parts = fullFilePath.split("/");
  const courseName = parts[0];
  const subfolder = parts[1];
  const filename = parts.slice(2).join("/");
  try {
    const res = await pool.query("SELECT folder_path FROM courses WHERE name = $1", [courseName]);
    console.log("数据库返回结果:", res.rows);
    const coursePath = res.rows[0].folder_path;
    const absolutePath = path.join(coursePath, subfolder, filename);
    return absolutePath;
  }
  catch (error) {
    console.error("获取文件详情失败: ", error);
    throw new Error(`获取文件详情失败: ${error}`);
  }
}