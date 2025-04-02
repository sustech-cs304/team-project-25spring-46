import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface CourseInfo {
    name: string;
    uri: vscode.Uri;
}

export async function openCourse(): Promise<CourseInfo | undefined> {
    const uris = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        openLabel: '选择课程文件夹'
    });
    if (uris && uris.length > 0) {
        const coursePath = uris[0].fsPath;
        const courseName = path.basename(coursePath);
        return { name: courseName, uri: uris[0] };
    }
    return undefined;
}

export async function createNewCourse(): Promise<CourseInfo | undefined> {
    const courseName = await vscode.window.showInputBox({
        prompt: '请输入新课程名称'
    });
    if (!courseName) {
        return undefined;
    }
    const folders = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        openLabel: '选择存放新课程的父文件夹'
    });
    if (!folders || folders.length === 0) {
        return undefined;
    }
    const parentFolder = folders[0].fsPath;
    const courseFolderPath = path.join(parentFolder, courseName);
    try {
        if (!fs.existsSync(courseFolderPath)) {
            fs.mkdirSync(courseFolderPath);
        }
        // 创建预设的子目录
        const subDirs = ['讲义', '示例代码', '笔记', '作业', '资料'];
        subDirs.forEach(subDir => {
            const subDirPath = path.join(courseFolderPath, subDir);
            if (!fs.existsSync(subDirPath)) {
                fs.mkdirSync(subDirPath);
            }
        });
        vscode.window.showInformationMessage(`新课程 "${courseName}" 创建成功！`);
        return { name: courseName, uri: vscode.Uri.file(courseFolderPath) };
    } catch (error) {
        vscode.window.showErrorMessage(`创建新课程失败：${error}`);
        return undefined;
    }
}

export interface CourseFile {
    name: string;
    path: string;
    isDirectory: boolean;
}

export async function getCourseFiles(uri: vscode.Uri): Promise<CourseFile[]> {
    const coursePath = uri.fsPath;
    try {
        const fileNames = fs.readdirSync(coursePath);
        const files: CourseFile[] = fileNames.map(name => {
            const fullPath = path.join(coursePath, name);
            const stat = fs.statSync(fullPath);
            return {
                name,
                path: fullPath,
                isDirectory: stat.isDirectory()
            };
        });
        return files;
    } catch (error) {
        vscode.window.showErrorMessage(`读取课程文件失败：${error}`);
        return [];
    }
}
