// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { createNewCourse, getCourses, getCourseSubfolderFiles, getFileDetails, getFileAbsolutePath} from './courseService';
import { exec } from 'child_process';
import pool from './database';
import supabase, { testSupabaseConnection } from './supabaseClient';
import { generateAISummary, generateAIQuiz } from './AIsummarizer';
import { createNewTask,getMyTasks,getProjectTasks,updateTask,deleteTask} from './taskService';
import { getProjects } from './projectService';
import { addComment, deleteCommentById, getAllComments } from './commentService';

import { defaultEnv, runPythonScript, runPythonCode, CondaEnv } from './python_env';

// 声明为全局变量，保持WebView面板的引用
let activePanel: vscode.WebviewPanel | undefined = undefined;

let currentUserId: number | null = null;
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Restore currentUserId from persistent storage
	currentUserId = context.globalState.get('currentUserId') || null;

	// Activate comment service test

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "test-combine" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('test-combine.openWebview', async () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('The extension is running!');
		await testSupabaseConnection();
		const panel = vscode.window.createWebviewPanel(
			'myWebview',
			'Course Aware IDE',
			vscode.ViewColumn.One,
			{
			  enableScripts: true,
			  localResourceRoots: [
				vscode.Uri.file(path.join(context.extensionPath, 'dist')),
				vscode.Uri.file('C:/')
			  ]
			}
		);
		// 如果已有面板，重用它
		if (activePanel) {
			activePanel.reveal();
		} else {
			// 创建新面板
			activePanel = vscode.window.createWebviewPanel(
				'myWebview',
				'Course Aware IDE',
				vscode.ViewColumn.One,
				{
				  enableScripts: true,
				  localResourceRoots: [
					vscode.Uri.file(path.join(context.extensionPath, 'dist')),
					vscode.Uri.file('C:/'),
					vscode.Uri.file('E:/'),
					vscode.Uri.file('D:/')
				  ]
				}
			);
			
			// 当面板被关闭时清除引用
			activePanel.onDidDispose(() => {
				activePanel = undefined;
			});
		}
		
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('The extension is running!');
		const webview = panel.webview;
		const cspSource = webview.cspSource;
		const dailyworkEnv = new CondaEnv('conda', 'dailywork');
		// 用 asWebviewUri 生成两个资源的可访问 URI
		const demoPdfUri = webview.asWebviewUri(
			vscode.Uri.file(path.join(context.extensionPath, 'dist', 'assets', 'sample.pdf'))
		);
		const workerUri = webview.asWebviewUri(
			vscode.Uri.file(path.join(context.extensionPath, 'dist', 'assets', 'pdf.worker.min.js'))
		);
		// 获取 index.html 路径
		const indexHtmlPath = path.join(context.extensionPath, 'dist', 'index.html');
		let htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
  
		// 替换 /assets/ 路径，注意：正则匹配 src 或 href 属性中以 /assets/ 开头的路径
		const assetsOnDisk = vscode.Uri.file(path.join(context.extensionPath, 'dist', 'assets'));
		const assetsUri = panel.webview.asWebviewUri(assetsOnDisk);
		// 将所有 src="/assets/ 或 href="/assets/ 替换为当前的 assetsUri 路径
		htmlContent = htmlContent.replace(/(src|href)="\/assets\//g, `$1="${assetsUri.toString()}/`);
  
		// 替换 favicon 路径 /vite.svg 为正确的 webview URI
		const viteSvgPath = vscode.Uri.file(path.join(context.extensionPath, 'dist', 'vite.svg'));
		const viteSvgUri = panel.webview.asWebviewUri(viteSvgPath);
		htmlContent = htmlContent.replace(/href="\/vite\.svg"/g, `href="${viteSvgUri.toString()}"`);
  
		// 插入内容安全策略（CSP）meta标签，确保允许加载需要的脚本和样式
		const cspMetaTag = `<meta http-equiv="Content-Security-Policy" content="
			default-src 'none';
			img-src ${cspSource} vscode-resource: https:;
			script-src ${cspSource} vscode-resource: 'unsafe-inline';
			style-src ${cspSource} vscode-resource: 'unsafe-inline';
			connect-src ${cspSource} vscode-resource: blob: http://localhost:3000;
			worker-src ${cspSource} blob:;
		">`;
		htmlContent = htmlContent.replace(/<head>/, `<head>\n  ${cspMetaTag}\n`);
		htmlContent = htmlContent.replace(
			/<body>/,
			`<body>
			  <script>
				window.__PDF_DOC__ = "${demoPdfUri}";
				window.__PDF_WORKER__ = "${workerUri}";
			  </script>`
		  );

		// 将处理后的 HTML 设置给 Webview
		panel.webview.html = htmlContent;

		panel.webview.onDidReceiveMessage(
			async (message) => {
			  if (message.command === 'getPdfPath') {
				// 计算绝对路径
				// ...
				panel.webview.postMessage({ command: 'PdfPath', path: pdfUri.toString() });
			  }
			  if (message.command === 'getPdfWorkerPath') {
				// ...
				panel.webview.postMessage({ command: 'PdfWorkerPath', path: workerUri.toString() });
			  }
			  // ...其他case
			},
			undefined,
			context.subscriptions
		);
		// createNewCourse("DemoCourse");
		const courses = await getCourses();
		console.log(courses);
	});

	context.subscriptions.push(disposable);

	const treeView = vscode.window.createTreeView('test-combine-treeview', {
		treeDataProvider: {
		// 返回空数组，这样 tree 里根本没有节点
		getChildren: () => Promise.resolve([]),
		getTreeItem: () => { throw new Error('unused'); }
		},
		showCollapseAll: false
	});
	context.subscriptions.push(treeView);

	// ③ 监听它“展开”（变 visible）的时刻
	treeView.onDidChangeVisibility(e => {
		if (e.visible) {
		// 打开你的 Webview
		vscode.commands.executeCommand('test-combine.openWebview').then(() => {
			// 然后把侧边栏切回 Explorer，这样真正看不见那个空空的 treeview
			vscode.commands.executeCommand('workbench.view.explorer');
		});
		}
	});

	// 监听编辑器保存事件，实现同步
	vscode.workspace.onDidSaveTextDocument((doc) => {
		const fileName = path.basename(doc.fileName);
		const match = fileName.match(/^codeblock_(\d+)\.(\w+)$/);
		if (match) {
			const blockIdx = parseInt(match[1], 10);
			const language = match[2];
			const code = doc.getText();
			// 发送同步消息到 Webview
			for (const panel of vscode.window.visibleTextEditors
				.map(e => e.document.uri.fsPath)
				.filter(f => f === doc.fileName)
				.map(() => vscode.window.activeTextEditor?.viewColumn === vscode.ViewColumn.One ? vscode.window.activeTextEditor : null)
				.filter(Boolean)) {
				// 这里假设只有一个 Webview，如果有多个需自行管理 panel
				// 直接发送到当前 panel
				(panel as any)?.webview?.postMessage?.({
					command: 'syncCodeBlock',
					blockIdx,
					code,
					language,
				});
			}
		}
	});
}

function getCatWebviewContent() {
	return`
		  <!DOCTYPE html>
		  <html lang="en">
		  <head>
			  <meta charset="UTF-8">
			  <meta name="viewport" content="width=device-width, initial-scale=1.0">
			  <title>Cat Coding</title>
		  </head>
		  <body>
			  <img src="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" width="300" />
		  </body>
		  </html>
	  `;
}

// This method is called when your extension is deactivated
export function deactivate() {}
