import * as vscode from 'vscode';
import * as path from 'path';
import { showMainInterface } from './MainInterface';
import { CourseTreeDataProvider } from './CourseTreeDataProvider';
import { CommentManager } from './share/src/commentManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "courseIDE" is now active!');

    // 注册显示主界面的命令
    context.subscriptions.push(vscode.commands.registerCommand('courseIDE.showMainInterface', () => {
        showMainInterface(context);
    }));

    // 注册打开已有课程的命令（点击主界面中课程列表时触发）
    context.subscriptions.push(vscode.commands.registerCommand('courseIDE.openExistingCourse', (coursePath: string) => {
        vscode.window.showInformationMessage('打开课程: ' + coursePath);
        // TODO: 扩展为打开课程详细 dashboard
    }));

    // 注册预览文件命令
    context.subscriptions.push(vscode.commands.registerCommand('courseIDE.previewFile', (filePath: string) => {
        openFilePreviewPanel(vscode.Uri.file(filePath), context);
    }));

    // 注册评论功能命令
    context.subscriptions.push(vscode.commands.registerCommand('courseIDE.openShareComments', (lectureId: string, lectureUrl: string) => {
        vscode.window.showInformationMessage('打开课件评论共享功能');
        const commentManager = new CommentManager(context.extensionUri);
        commentManager.showCommentEntryUI();
    }));

    // 可选：左侧 TreeView 展示课程列表（同步 globalState 中的课程）
    const treeDataProvider = new CourseTreeDataProvider(context);
    const treeView = vscode.window.createTreeView('courseView', { treeDataProvider });
    context.subscriptions.push(treeView);
}

function openFilePreviewPanel(fileUri: vscode.Uri, context: vscode.ExtensionContext) {
    const fileExt = path.extname(fileUri.fsPath).toLowerCase();

    // 支持的文件类型列表
    const supportedFileTypes = ['.pdf', '.py', '.c', '.md', '.pptx', '.txt'];

    // 如果文件类型在支持的类型列表中，直接使用 vscode.open 打开
    if (supportedFileTypes.includes(fileExt)) {
        vscode.commands.executeCommand('vscode.open', fileUri);
        return;
    }

    // 否则，对其他文件依然使用 WebView 中的 iframe 打开
    const panel = vscode.window.createWebviewPanel(
        'filePreview',
        '文件预览: ' + path.basename(fileUri.fsPath),
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
        <h1>文件预览: ${path.basename(fileUri.fsPath)}</h1>
        <iframe src="${webviewUri}" style="width:100%; height:90vh;" frameborder="0"></iframe>
    </body>
    </html>
    `;
}

export function deactivate() {}
