import * as vscode from 'vscode';
import { CourseTreeDataProvider, CourseItem } from './CourseTreeDataProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "courseIDE" is now active!');

    // 创建 TreeView，并使用自定义的 CourseTreeDataProvider 提供数据
    const treeDataProvider = new CourseTreeDataProvider();
    const treeView = vscode.window.createTreeView('courseView', { treeDataProvider });
    context.subscriptions.push(treeView);

    // 注册命令：点击树节点时，打开对应的 WebView 面板显示详情
    const disposable = vscode.commands.registerCommand('courseIDE.openWebview', (item: CourseItem) => {
        // 创建并显示一个新的 WebView 面板
        const panel = vscode.window.createWebviewPanel(
            'courseDetails',        // 内部标识
            item.label,             // 面板标题
            vscode.ViewColumn.One,  // 显示在编辑器第一列
            {}                      // WebView 选项（可根据需求扩展）
        );
        panel.webview.html = getWebviewContent(item.label);
    });
    context.subscriptions.push(disposable);
}

function getWebviewContent(title: string): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
</head>
<body>
    <h1>${title}</h1>
    <p>这里显示的是课程详情内容，后续可以扩展更多功能。</p>
</body>
</html>`;
}

export function deactivate() {}
