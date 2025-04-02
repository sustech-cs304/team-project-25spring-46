import * as vscode from 'vscode';
import * as path from 'path';
import { showMainInterface } from './MainInterface';
import { CourseTreeDataProvider } from './CourseTreeDataProvider';
import { showWebviewPanel } from './AIsummarizer'; 

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
   
    const disposable = vscode.commands.registerCommand('aiSummarizer.openPanel', () => {
        showWebviewPanel(context); // 调用功能模块
    });

    context.subscriptions.push(disposable);


    // 可选：左侧 TreeView 展示课程列表（同步 globalState 中的课程）
    const treeDataProvider = new CourseTreeDataProvider(context);
    const treeView = vscode.window.createTreeView('courseView', { treeDataProvider });
    context.subscriptions.push(treeView);
}

function openFilePreviewPanel(fileUri: vscode.Uri, context: vscode.ExtensionContext) {
    // 如果是 PDF 文件，直接用 VSCode 打开（默认或已安装的 PDF 预览插件）
    if (path.extname(fileUri.fsPath).toLowerCase() === '.pdf') {
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
