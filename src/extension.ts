// extension.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { showMainInterface } from './MainInterface';
import { CourseTreeDataProvider } from './CourseTreeDataProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "courseIDE" is now active!');

    context.subscriptions.push(vscode.commands.registerCommand('courseIDE.showMainInterface', () => {
        showMainInterface(context);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('courseIDE.openExistingCourse', (coursePath: string) => {
        vscode.window.showInformationMessage('打开课程: ' + coursePath);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('courseIDE.previewFile', (filePath: string) => {
        openFilePreviewPanel(vscode.Uri.file(filePath), context);
    }));

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
    if (path.extname(fileUri.fsPath).toLowerCase() === '.pdf') {
        vscode.commands.executeCommand('vscode.open', fileUri);
        return;
    }

    const panel = vscode.window.createWebviewPanel(
        'filePreview',
        '文件预览: ' + path.basename(fileUri.fsPath),
        vscode.ViewColumn.Two,
        { enableScripts: true }
    );

    const webviewUri = panel.webview.asWebviewUri(fileUri);

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