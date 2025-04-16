// extension.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { showMainInterface } from './MainInterface';
import { CourseTreeDataProvider } from './CourseTreeDataProvider';

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

    // 可选：左侧 TreeView 展示课程列表（同步 globalState 中的课程）
    // New command to add a file with a deadline
    context.subscriptions.push(vscode.commands.registerCommand('courseIDE.addFileWithDeadline', async () => {
        const fileUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            openLabel: '选择文件'
        });
        if (fileUri && fileUri.length > 0) {
            const filePath = fileUri[0].fsPath;
            const deadline = await vscode.window.showInputBox({
                prompt: '请输入截止日期 (格式: YYYY-MM-DD)',
                validateInput: (value) => {
                    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                    if (!dateRegex.test(value)) {
                        return '请使用 YYYY-MM-DD 格式';
                    }
                    const date = new Date(value);
                    if (isNaN(date.getTime())) {
                        return '无效的日期';
                    }
                    return null;
                }
            });
            if (deadline) {
                let storedFiles = context.globalState.get<{ path: string, deadline: string }[]>('filesWithDeadlines') || [];
                if (!storedFiles.find(f => f.path === filePath)) {
                    storedFiles.push({ path: filePath, deadline });
                    context.globalState.update('filesWithDeadlines', storedFiles);
                    vscode.window.showInformationMessage(`已为文件 "${filePath}" 设置截止日期: ${deadline}`);
                    // Refresh the tree view
                    treeDataProvider.refresh();
                } else {
                    vscode.window.showWarningMessage(`文件 "${filePath}" 已存在截止日期`);
                }
            }
        }
    }));

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