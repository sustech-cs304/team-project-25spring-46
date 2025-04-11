import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { showMainInterface } from './MainInterface';
import { CourseTreeDataProvider } from './CourseTreeDataProvider';
import { SharedDocManager } from './SharedDocManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "courseIDE" is now active!');

    // 注册显示主界面的命令
    context.subscriptions.push(vscode.commands.registerCommand('courseIDE.showMainInterface', () => {
        showMainInterface(context);
    }));

    // 注册打开已有课程的命令（点击主界面中课程列表时触发）
    context.subscriptions.push(vscode.commands.registerCommand('courseIDE.openExistingCourse', (coursePath: string) => {
        vscode.window.showInformationMessage('打开课程: ' + coursePath);
        console.log('打开课程命令触发:', coursePath);
        // TODO: 扩展为打开课程详细 dashboard
    }));

    // 注册预览文件命令
    context.subscriptions.push(vscode.commands.registerCommand('courseIDE.previewFile', (filePath: string) => {
        openFilePreviewPanel(vscode.Uri.file(filePath), context);
    }));

    // 可选：左侧 TreeView 展示课程列表（同步 globalState 中的课程）
    const treeDataProvider = new CourseTreeDataProvider(context);
    const treeView = vscode.window.createTreeView('courseView', { treeDataProvider });
    context.subscriptions.push(treeView);

    // 注册共享编辑命令
    const sharedDocManager = new SharedDocManager(context);
    context.subscriptions.push(
        vscode.commands.registerCommand('courseIDE.startCollaboration', () => {
            sharedDocManager.init();
            vscode.window.showInformationMessage('已启动共享文档编辑功能');
        })
    );

}

function openFilePreviewPanel(fileUri: vscode.Uri, context: vscode.ExtensionContext) {
    const ext = path.extname(fileUri.fsPath).toLowerCase();
    const fileName = path.basename(fileUri.fsPath);

    // 如果是 PDF 文件，直接用 VSCode 打开（默认或已安装的 PDF 预览插件）
    if (ext === '.pdf') {
        vscode.commands.executeCommand('vscode.open', fileUri);
        return;
    } else if (ext === '.md') {  // 处理 Markdown 文件
        vscode.commands.executeCommand('vscode.open', fileUri); // 打开源文件
        vscode.commands.executeCommand('markdown.showPreviewToSide', fileUri); //打开预览
        return;
    } else if (ext === '.py') {  // 处理 Python 文件
        vscode.commands.executeCommand('vscode.open', fileUri);
        return;
    } else {  //其他文件依然使用 WebView 中的 iframe 打开
        const panel = vscode.window.createWebviewPanel(
            'filePreview',
            '文件预览: ' + fileName,
            vscode.ViewColumn.Two,
            { enableScripts: true }
        );

        // 转换为可在 WebView 中访问的资源路径
        const webviewUri = panel.webview.asWebviewUri(fileUri);

        // 可以加上 CSP 设置，保证 iframe 能正确加载资源
        panel.webview.html = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy"
                content="default-src 'none'; frame-src ${panel.webview.cspSource} blob:; 
                        style-src 'unsafe-inline' ${panel.webview.cspSource}; 
                        script-src 'unsafe-inline' ${panel.webview.cspSource};">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>文件预览</title>
        </head>
        <body>
            <h1>文件预览: ${fileName}</h1>
            <iframe src="${webviewUri}" style="width:100%; height:90vh;" frameborder="0"></iframe>
        </body>
        </html>
        `;
    }
}

export function deactivate() {}
