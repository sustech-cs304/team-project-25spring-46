// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { createNewCourse, getCourses, getCourseSubfolderFiles, getFileDetails, getFileAbsolutePath} from './courseService';
import { exec } from 'child_process';
import pool from './database';
import { generateAISummary, generateAIQuiz } from './AIsummarizer';
import { activate as activateTestCommands } from './test/testComment';
import { createNewTask,getMyTasks,getProjectTasks,updateTask,deleteTask} from './taskService';
import { getProjects } from './projectService';
import { getAllComments } from './commentService';

let currentUserId: number | null = null;
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Activate comment service test
	activateTestCommands(context);

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
				vscode.Uri.file(path.join(context.extensionPath, 'dist')),
				vscode.Uri.file('C:/'),
				vscode.Uri.file(path.join(context.extensionPath)),
				vscode.Uri.file(path.dirname(context.extensionPath)),
				vscode.Uri.file('D:/'),  // 添加 D 盘路径
				vscode.Uri.file('d:/')   // 添加小写的 d 盘路径
			  ]
			}
		);
		const webview = panel.webview;
		const cspSource = webview.cspSource;
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
			img-src ${cspSource} https:;
			script-src ${cspSource} 'unsafe-inline';
			style-src ${cspSource} 'unsafe-inline';
			connect-src ${cspSource} blob:;
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
				case 'createTask':
					try {
						console.log("Extension - createTask message.data:", message.data); // 添加日志
						const { title, details, due_date, priority,status, course_id, project_id} = message.data; // 确保 status 被接收
						// 检查当前用户是否已登录
						if (currentUserId === null) {
							panel.webview.postMessage({ command: 'createTaskResult', success: false, error: '用户未登录，无法创建任务' });
							return;
						}
						const result = await createNewTask({
						title,
						details,
						due_date,
						priority,
						status,
						course_id,
						project_id,
						assignee_id: currentUserId, // 假设当前用户 ID 为 1
						});
						panel.webview.postMessage({ command: 'createTaskResult', success: true, data: result });
					} catch (error: any) {
						panel.webview.postMessage({ command: 'createTaskResult', success: false, error: error.message });
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
				case 'getMyTasks' :
					try {
							if (currentUserId === null) {
							panel.webview.postMessage({ command: 'error', error: '用户未登录，无法获取任务' });
							return;
						}
						const tasks = await getMyTasks(currentUserId); // 使用获取到的用户 ID
						panel.webview.postMessage({ command: 'getMyTasks', tasks });
					} catch (error: any) {
						panel.webview.postMessage({ command: 'error', error: error.message });
					}
					break;
				case 'getProjectTasks' :
					try {
						const projectId = 1;
						const tasks = await getProjectTasks(projectId);
    					panel.webview.postMessage({ command: 'projectTasksData', tasks });
					} catch (error: any) {
						panel.webview.postMessage({ command: 'error', error: error.message });
					}
					break;
				case 'updateTask':
					try {
						console.log("Extension - updateTask message.data:", message.data); // 添加日志
						const { id, title, details, due_date, status, priority, course_id, project_id } = message.data;
						await updateTask({
						id,
						title,
						details,
						due_date,
						status,
						priority,
						course_id,
						project_id,
						});
						panel.webview.postMessage({ command: 'updateTaskResult', success: true, taskId: id });
					} catch (error: any) {
						console.error("Extension - updateTask error:", error); // 添加日志
						panel.webview.postMessage({ command: 'updateTaskResult', success: false, error: error.message });
					}
					break;
				case 'deleteTask':
					try {
						const taskId = message.taskId;
						if (!taskId) {
						panel.webview.postMessage({ command: 'error', error: '未提供任务 ID' });
						return;
						}
						await deleteTask(taskId);
						panel.webview.postMessage({ command: 'deleteTaskResult', success: true, taskId });
					} catch (error: any) {
						panel.webview.postMessage({ command: 'deleteTaskResult', success: false, error: error.message });
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
				case 'getAllComments':
					try {
						const comments = await getAllComments(message.filePath);
						panel.webview.postMessage({
						command: 'getAllCommentsSuccess',
						comments,
						});
					} catch (error) {
						panel.webview.postMessage({
						command: 'getAllCommentsError',
						error: error || String(error),
						});
					}
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
				case 'openFile':
				try{
					const filePath = message.filePath;
                    vscode.window.showInformationMessage(`打开 PDF 文件: ${filePath}`);
                    try {
						const jsonFilePath = path.join(context.extensionPath, 'cr_out') + "\\" + path.parse(filePath).name + "_code_block.json";
                        const jsonContent = await vscode.workspace.fs.readFile(vscode.Uri.file(jsonFilePath));
                        const jsonString = Buffer.from(jsonContent).toString('utf-8');
                        vscode.window.showInformationMessage(`JSON 文件内容: ${jsonString}`);
						panel.webview.postMessage({command: 'pdfCodeBlocks', data: jsonString});
                    } catch (error) {
                        vscode.window.showErrorMessage(`无法读取 JSON 文件: ${error}`);
                    }
				}
				catch(err: any) {
					panel.webview.postMessage({command: 'error', error: err.message});
				}
					break;
				case 'generateSummary':
					try {
						const summary = await generateAISummary(message.filePath);
						panel.webview.postMessage({ command: 'aiSummaryResult', content: summary });
					} catch (error: any) {
						panel.webview.postMessage({ command: 'aiError', error: error.message });
					}
					break;
			
				case 'generateQuiz':
					try {
						const quiz = await generateAIQuiz(message.filePath);
						panel.webview.postMessage({ command: 'aiQuizResult', content: quiz });
					} catch (error: any) {
						panel.webview.postMessage({ command: 'aiError', error: error.message });
					}
					break;
				case 'getPdfPath':
					try {
						const absolutePath = await getFileAbsolutePath(message.path);
						console.log("File's Absolute Path is: "+absolutePath);
						const pdfPath = vscode.Uri.file(absolutePath);
						const pdfUri = panel.webview.asWebviewUri(pdfPath);
						console.log("path: "+pdfUri.toString());
						panel.webview.postMessage({ command: 'PdfPath', path: pdfUri.toString() });
						console.log("finish command getPdfPath ----");
					} catch (error: any) {
						panel.webview.postMessage({ command: 'error', error: error.message });
					}
					break;

				case 'getDemoPdfPath':
					try {
						// const demoPdfPath = path.join(context.extensionPath, 'dist', 'assets', 'sample.pdf');
						const demoPdfPath = vscode.Uri.joinPath(context.extensionUri, 'dist', 'assets', 'sample.pdf');
						const demoPdfUri = panel.webview.asWebviewUri(demoPdfPath);
						panel.webview.postMessage({ command: 'demoPdfPath', filePath: demoPdfUri.toString() });
					} catch (error: any) {
						panel.webview.postMessage({ command: 'error', error: error.message });
					}
					break;
				case 'getPdfWorkerPath':
					try {
						// const PdfWorkerPath = path.join(context.extensionPath, 'dist', 'assets', 'pdf.worker.min.js');
						const PdfWorkerPath = vscode.Uri.joinPath(context.extensionUri, 'dist', 'assets', 'pdf.worker.min.js');
						const PdfWorkerUri = panel.webview.asWebviewUri(PdfWorkerPath);
						panel.webview.postMessage({ command: 'PdfWorkerPath', path: PdfWorkerUri.path });
					} catch (error: any) {
						panel.webview.postMessage({ command: 'error', error: error.message });
					}
					break;
			case 'login':
				try {
					const { email } = message;
					const res = await pool.query(
					'SELECT id, name, email, role FROM users WHERE email = $1',
					[email]
					);
					if (res.rows.length === 0) {
					// 用户不存在，报错
					panel.webview.postMessage({
						command: 'loginResult',
						success: false,
						error: '用户不存在，请先注册'
					});
					} else {
					const userRecord = res.rows[0];
					currentUserId = userRecord.id;
					panel.webview.postMessage({
						command: 'loginResult',
						success: true,
						user: userRecord
					});
					}
				} catch (err: any) {
					panel.webview.postMessage({
					command: 'loginResult',
					success: false,
					error: err.message
					});
				}
				break;

				// —— 注册（只在此处插入新用户） ——
				case 'register':
				try {
					const { name, email } = message;
					// 先检查邮箱是否已被注册
					const exist = await pool.query(
					'SELECT id FROM users WHERE email = $1',
					[email]
					);
					if (exist.rows.length > 0) {
					panel.webview.postMessage({
						command: 'registerResult',
						success: false,
						error: '该邮箱已被注册'
					});
					} else {
					const insert = await pool.query(
						'INSERT INTO users(name, email, role) VALUES($1,$2,$3) RETURNING id, name, email, role',
						[name, email, 'student']
					);
					const newUser = insert.rows[0];
					currentUserId = newUser.id;
					panel.webview.postMessage({
						command: 'registerResult',
						success: true,
						user: newUser
					});
					}
				} catch (err: any) {
					panel.webview.postMessage({
					command: 'registerResult',
					success: false,
					error: err.message
					});
				}
				break;

				// —— 注销 ——
				case 'logout':
				currentUserId = null;
				panel.webview.postMessage({
					command: 'logoutResult',
					success: true
				});
				break;

				// —— 获取当前登录用户 ID ——
				case 'getCurrentUserid':
				panel.webview.postMessage({
					command: 'currentUseridResult',
					success: true,
					userId: currentUserId
				});
				break;
				default:
				  vscode.window.showInformationMessage(`未识别的命令: ${message.command}`);
				  console.log(`未识别的命令: ${message.command}`);
				  break;
				case 'getProjects': // 添加 getProjects 命令处理
				try {
				const projects = await getProjects();
				panel.webview.postMessage({ command: 'projectsData', projects });
				} catch (error: any) {
				panel.webview.postMessage({ command: 'error', error: error.message });
				}
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
