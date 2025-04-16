// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { createNewCourse, getCourses, getCourseSubfolderFiles, getFileDetails} from './courseService';
import { exec } from 'child_process';
import pool from './database';
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

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
		const panel = vscode.window.createWebviewPanel(
			'myWebview',
			'Course Aware IDE',
			vscode.ViewColumn.One,
			{
			  enableScripts: true,
			  localResourceRoots: [
				vscode.Uri.file(path.join(context.extensionPath, 'dist'))
			  ]
			}
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
		const cspMetaTag = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' vscode-resource:; style-src vscode-resource: 'unsafe-inline';">`;
		htmlContent = htmlContent.replace(/<head>/, `<head>\n  ${cspMetaTag}\n`);
  
		// 将处理后的 HTML 设置给 Webview
		panel.webview.html = htmlContent;

		panel.webview.onDidReceiveMessage(
			async message => {
			  switch (message.command) {
				case 'createCourse':
					try {
						// 使用 VS Code API 获取用户输入的课程名
						const courseName = await vscode.window.showInputBox({
						prompt: "请输入新课程名称",
						placeHolder: "例如：数据结构"
						});

						if (!courseName) {
						panel.webview.postMessage({ command: 'createCourseResult', success: false, error: '未输入课程名' });
						return;
						}

						const result = await createNewCourse(courseName);
						panel.webview.postMessage({ command: 'createCourseResult', success: true, data: result });
					} catch (error: any) {
						panel.webview.postMessage({ command: 'createCourseResult', success: false, error: error.message });
					}
					break;
				case 'getCourses':
					try {
						const courses = await getCourses();
						panel.webview.postMessage({ command: 'coursesData', courses });
					} catch (error: any) {
						panel.webview.postMessage({ command: 'getCoursesResult', success: false, error: error.message });
					}
					break;
				case 'getCourseFiles':
					try {
						const files = await getCourseSubfolderFiles(message.courseName);
						panel.webview.postMessage({ command: 'courseFilesData', files });
					} catch (error: any) {
						panel.webview.postMessage({ command: 'error', error: error.message });
					}
					break;
					case 'getFileDetails':
						try {
						  const details = await getFileDetails(message.filePath);
						  panel.webview.postMessage({ command: 'fileDetails', details });
						} catch (error: any) {
						  panel.webview.postMessage({ command: 'error', error: error.message });
						}
						break;
				  
					case 'runCodeRecognition':
					try {
						const parts = message.filePath.split("/");
						const courseName = parts[0];
						const subfolder = parts[1];
						const filename = parts.slice(2).join("/");
						const res = await pool.query("SELECT folder_path FROM courses WHERE name = $1", [courseName]);
						console.log("数据库返回结果:", res.rows);
						const coursePath = res.rows[0].folder_path;
						const absolutePath = path.join(coursePath, subfolder, filename);
						const scriptPath = path.join(context.extensionPath, 'src', 'pdf_test.py');
						const outPath = path.join(context.extensionPath, 'cr_out');
						const pythonPath = "C:\\ProgramData\\miniconda3\\python.exe";
						console.log("executing python script with filePath: ", absolutePath, scriptPath, outPath);
						exec(`"${pythonPath}" "${scriptPath}" "${absolutePath}" "${outPath}"`, (error, stdout, stderr) => {
						if (error) {
							panel.webview.postMessage({ command: 'error', error: error.message });
							return;
						}
				
						// 解析输出的代码文件路径 (每一行一个)
						const codeFiles = stdout.trim().split('\n');
						// Promise.all(codeFiles.map(async (codePath) => ({
						// 	path: codePath,
						// 	content: await fs.promises.readFile(codePath, 'utf-8')
						// }))).then((codes) => {
						// 	panel.webview.postMessage({ command: 'codeRecognitionResult', codes });
						// });
						const codes = codeFiles.map((content, index) => ({
							path: `Snippet ${index + 1}`,
							content
						  }));
						  panel.webview.postMessage({ command: 'codeRecognitionResult', codes });
						});
					} catch (err: any) {
						panel.webview.postMessage({ command: 'error', error: err.message });
					}
					break;
				default:
				  vscode.window.showInformationMessage(`未识别的命令: ${message.command}`);
				  break;
			  }
			},
			undefined,
			context.subscriptions
		);
		// createNewCourse("DemoCourse");
		const courses = await getCourses();
		console.log(courses);
	});

	context.subscriptions.push(disposable);
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
