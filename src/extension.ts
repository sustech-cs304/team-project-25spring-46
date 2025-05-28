// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
	createNewCourse,
	getCourses,
	getCourseSubfolderFiles,
	getFileDetails,
	getFileAbsolutePath
} from './courseService';
import { exec } from 'child_process';
import pool from './database';
import supabase, { testSupabaseConnection } from './supabaseClient';
import { generateAISummary, generateAIQuiz } from './AIsummarizer';
import { getProjects } from './projectService';
import { addComment, deleteCommentById, getAllComments } from './commentService';
let panel: vscode.WebviewPanel | undefined;
import { defaultEnv, runPythonScript, runPythonCode, CondaEnv } from './python_env';

export let currentUserId: number | null = null;
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Restore currentUserId from persistent storage
	currentUserId = context.globalState.get('currentUserId') || null;

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "test-combine" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('test-combine.openWebview', async () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		if (panel) {
            panel.reveal(vscode.ViewColumn.One);
            return;
        }
		vscode.window.showInformationMessage('The extension is running!');
		await testSupabaseConnection();

		panel = vscode.window.createWebviewPanel(
			'myWebview',
			'Course Aware IDE',
			vscode.ViewColumn.One,
			{
			  enableScripts: true,
			  retainContextWhenHidden: true,
			  localResourceRoots: [
				vscode.Uri.file(path.join(context.extensionPath, 'dist')),
				vscode.Uri.file('C:/'),
				vscode.Uri.file('D:/'),
                vscode.Uri.file('E:/'),
                vscode.Uri.file('F:/'),
			  ]
			}
		);
		panel.onDidDispose(() => {
            panel = undefined;
        });
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
            async message => {
                switch (message.command) {
				case 'addComment':
					try {
						console.log("Extension - addComment message.data:", message.data); // 添加日志
						const { filePath, comment } = message.data;
						console.log("Extension - addComment filePath:", filePath); // 添加日志
						console.log("Extension - addComment comment:", comment); // 添加日志
						const result = await addComment(comment);
						panel?.webview.postMessage({ command: 'addCommentResult', success: true, data: result });
					} catch (error: any) {
						panel?.webview.postMessage({ command: 'addCommentResult', success: false, error: error.message });
					}
					break;
                    case 'createCourse':
                        try {
                            // 使用 VS Code API 获取用户输入的课程名
                            const courseName = await vscode.window.showInputBox({
                                prompt: "请输入新课程名称",
                                placeHolder: "例如：数据结构"
                            });

                            if (!courseName) {
                                panel?.webview.postMessage({
                                   
									command: 'createCourseResult',
                                   
									success: false,
                                   
									error: '未输入课程名'
                               
								});
                                return;
                            }

						const result = await createNewCourse(courseName);
						panel?.webview.postMessage({ command: 'createCourseResult', success: true, data: result });
						const courses = await getCourses();
						panel?.webview.postMessage({ command: 'coursesData', courses });
					} catch (error: any) {
						panel?.webview.postMessage({ command: 'createCourseResult', success: false, error: error.message });
					}
					break;
				case 'createTask':
					try {
						console.log("Extension - createTask message.data:", message.data);
						const { title, details, due_date, priority, status, group_id, assignee_id } = message.data;

						// 检查当前用户是否已登录
						if (currentUserId === null) {
							panel?.webview.postMessage({
								command: 'createTaskResult',
								success: false,
								error: '用户未登录，无法创建任务'
							});
							return;
						}

						const { data, error } = await supabase
							.from('tasks')
							.insert([{
								title,
								details,
								due_date,
								priority,
								status,
								group_id,
								assignee_id: assignee_id || currentUserId,
								completion: false
							}])
							.select()
							.single();

						if (error) {
							panel?.webview.postMessage({
								command: 'createTaskResult',
								success: false,
								error: error.message
							});
							return;
						}

						panel?.webview.postMessage({
							command: 'createTaskResult',
							success: true,
							data: data
						});
					} catch (error: any) {
						panel?.webview.postMessage({
							command: 'createTaskResult',
							success: false,
							error: error.message
						});
					}
					break;
				case 'deleteCourse':
					try {
						const courseId = Number(message.courseId);
						if (isNaN(courseId)) {
							throw new Error('无效的课程 ID');
						}
						
						const folderPath = await supabase
							.from('courses')
							.select('folder_path')
							.eq('id', courseId)
							.single()
							.then(res => res.data?.folder_path);
							
						// 1. 从 Supabase 删除
						const { error: delErr } = await supabase
							.from('courses')
							.delete()
							.eq('id', courseId);
						if (delErr) throw delErr;

						await fs.promises.rm(folderPath, { recursive: true, force: true });
						// 2. 通知前端删除成功
						panel?.webview.postMessage({
							command: 'deleteCourseResult',
							success: true,
							courseId
						});

						// 3. 刷新课程列表
						const updated = await getCourses();
						panel?.webview.postMessage({ command: 'coursesData', courses: updated });

					} catch (err: any) {
						panel?.webview.postMessage({
							command: 'deleteCourseResult',
							success: false,
							error: err.message
						});
					}
					break;
				case 'getCourses':
					try {
						const courses = await getCourses();
						panel?.webview.postMessage({ command: 'coursesData', courses });
					} catch (error: any) {
						panel?.webview.postMessage({ command: 'getCoursesResult', success: false, error: error.message });
					}
					break;
				case 'getMyTasks':
						try {
							if (currentUserId === null) {
								panel?.webview.postMessage({
									command: 'getMyTasksResult',
									success: false,
									error: '用户未登录，无法获取任务'
								});
								return;
							}

							interface TaskWithRelations {
								id: number;
								title: string;
								details: string | null;
								due_date: string;
								status: string;
								priority: string;
								completion: boolean;
								group_id: number | null;
								assignee_id: number | null;
								groups: { id: number; name: string } | null;
								users: { id: number; name: string } | null;
							}

							const { data, error } = await supabase
								.from('tasks')
								.select(`
                                    id,
                                    title,
                                    details,
                                    due_date,
                                    status,
                                    priority,
                                    completion,
                                    group_id,
                                    assignee_id,
                                    groups:group_id (
                                        id,
                                        name
                                    ),
                                    users:assignee_id (
                                        id,
                                        name
                                    )
                                `)
								.eq('assignee_id', currentUserId)
								.order('due_date', { ascending: true });

							if (error) {
								panel?.webview.postMessage({
									command: 'getMyTasksResult',
									success: false,
									error: error.message
								});
								return;
							}

							// Transform the data to include group and assignee names
							const tasks = ((data as unknown) as TaskWithRelations[]).map(task => ({
								...task,
								group_name: task.groups?.name || null,
								assignee_name: task.users?.name || null,
								groups: undefined, // Remove the nested objects
								users: undefined
							}));

							panel?.webview.postMessage({
								command: 'getMyTasksResult',
								success: true,
								tasks: tasks
							});
						} catch (error: any) {
							panel?.webview.postMessage({
								command: 'getMyTasksResult',
								success: false,
								error: error.message
							});
						}
						break;
				case 'updateTask':
						try {
							console.log("Extension - updateTask message.data:", message.data);
							const {
								id,
								title,
								details,
								due_date,
								status,
								priority,
								group_id,
								completion
							} = message.data;

							const updates: any = {};
							if (title !== undefined) updates.title = title;
							if (details !== undefined) updates.details = details;
							if (due_date !== undefined) updates.due_date = due_date;
							if (status !== undefined) updates.status = status;
							if (priority !== undefined) updates.priority = priority;
							if (group_id !== undefined) updates.group_id = group_id;
							if (completion !== undefined) updates.completion = completion;

							const { data, error } = await supabase
								.from('tasks')
								.update(updates)
								.eq('id', id)
								.select()
								.single();

							if (error) {
								panel?.webview.postMessage({
									command: 'updateTaskResult',
									success: false,
									error: error.message
								});
								return;
							}

							panel?.webview.postMessage({
								command: 'updateTaskResult',
								success: true,
								data: data
							});
						} catch (error: any) {
							panel?.webview.postMessage({
								command: 'updateTaskResult',
								success: false,
								error: error.message
							});
						}
						break;
				case 'deleteTask':
						try {
							const taskId = message.taskId;
							if (!taskId) {
								panel?.webview.postMessage({
									command: 'deleteTaskResult',
									success: false,
									error: '未提供任务 ID'
								});
								return;
							}

							const { error } = await supabase
								.from('tasks')
								.delete()
								.eq('id', taskId);

							if (error) {
								panel?.webview.postMessage({
									command: 'deleteTaskResult',
									success: false,
									error: error.message
								});
								return;
							}

							panel?.webview.postMessage({
								command: 'deleteTaskResult',
								success: true,
								taskId: taskId
							});
						} catch (error: any) {
							panel?.webview.postMessage({
								command: 'deleteTaskResult',
								success: false,
								error: error.message
							});
						}
						break;
				case 'getCourseFiles':
					try {
						const files = await getCourseSubfolderFiles(message.courseName);
						panel?.webview.postMessage({ command: 'courseFilesData', files });
					} catch (error: any) {
						panel?.webview.postMessage({ command: 'error', error: error.message });
					}
					break;
				case 'getFileDetails':
					try {
						const details = await getFileDetails(message.filePath);
						panel?.webview.postMessage({ command: 'fileDetails', details });
					} catch (error: any) {
						panel?.webview.postMessage({ command: 'error', error: error.message });
					}
					break;
				case 'getAllComments':
					try {
						const comments = await getAllComments(message.filePath);
						panel?.webview.postMessage({
						command: 'getAllCommentsSuccess',
						comments,
						});
					} catch (error) {
						panel?.webview.postMessage({
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
					// const outPath = "E:/test";

					// 发送开始识别的消息
					panel?.webview.postMessage({ command: 'recognitionStarted' });

					try {
						// 确保输出目录存在
						if (!fs.existsSync(outPath)) {
							fs.mkdirSync(outPath, { recursive: true });
						}
						console.log(`开始识别文件: ${absolutePath}, 输出目录: ${outPath}`);
						// 运行 Python 脚本
						const command = [absolutePath, outPath];
						const stdout = dailyworkEnv.runScript(scriptPath, command);
						
						// 等待 JSON 文件生成
						const jsonFilePath = path.join(outPath, path.parse(filename).name + "_code_block.json");
						let retries = 0;
						const maxRetries = 10;
						const checkInterval = 500; // 500ms

						const waitForJson = () => new Promise((resolve, reject) => {
							const checkFile = () => {
								if (fs.existsSync(jsonFilePath)) {
									try {
										const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
										resolve(jsonContent);
									} catch (err) {
										reject(err);
									}
								} else if (retries < maxRetries) {
									retries++;
									setTimeout(checkFile, checkInterval);
								} else {
									reject(new Error('JSON 文件生成超时'));
								}
							};
							checkFile();
						});

						// 等待 JSON 文件生成并读取内容
						const jsonContent = await waitForJson();
						
						// 发送识别结果
						panel?.webview.postMessage({ 
							command: 'pdfCodeBlocks', 
							data: jsonContent 
						});
						
						// 发送识别完成的消息
						panel?.webview.postMessage({ command: 'recognitionCompleted' });
					} catch (error: any) {
						console.error('代码识别错误:', error);
						panel?.webview.postMessage({ 
							command: 'recognitionError', 
							error: error.message 
						});
						vscode.window.showErrorMessage(`代码识别失败: ${error.message}`);
					}
				} catch (err: any) {
					console.error('代码识别错误:', err);
					panel?.webview.postMessage({ 
						command: 'recognitionError', 
						error: err.message 
					});
					vscode.window.showErrorMessage(`代码识别失败: ${err.message}`);
				}
				break;
				case 'openFile': {
				  try {
					const filePath = message.filePath;
					
					console.log(`打开文件: ${filePath}`);
					vscode.window.showInformationMessage(`打开 PDF 文件: ${filePath}`);
					
					// 尝试获取 PDF 的绝对路径
					const absolutePath = await getFileAbsolutePath(filePath);
					const pdfPath = vscode.Uri.file(absolutePath);
					const pdfUri = panel?.webview.asWebviewUri(pdfPath);
					panel?.webview.postMessage({ command: 'PdfPath', path: pdfUri?.toString() });
					
					// 检查 JSON 文件是否存在
					const jsonFileName = path.parse(filePath).name + "_code_block.json";
					const jsonFilePath = path.join(context.extensionPath, 'cr_out', jsonFileName);
					
					console.log(`检查JSON文件路径: ${jsonFilePath}`);
					
					if (fs.existsSync(jsonFilePath)) {
					  try {
						const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
						// 输出 JSON 文件内容到扩展终端
						console.log(`读取到 JSON 文件内容长度: ${jsonContent.length}`);
						console.log(`JSON内容片段: ${jsonContent.substring(0, 200)}...`);
						
						// 确保JSON格式正确
						const parsedJson = JSON.parse(jsonContent);
						console.log(`解析后的JSON对象包含 ${parsedJson.length} 个代码块`);
						
						// 将读取到的代码块 JSON 数据发送到 Webview
						panel?.webview.postMessage({
						  command: 'pdfCodeBlocks',
						  data: jsonContent
						});
						
						console.log('已发送pdfCodeBlocks消息到前端');
					  } catch (err) {
						// 安全地获取错误信息
						const errorMessage = err instanceof Error ? err.message : String(err);
						console.error(`读取或解析JSON文件失败:`, err);
						panel?.webview.postMessage({ 
						  command: 'error', 
						  error: `读取代码块数据失败: ${errorMessage}` 
						});
					  }
					} else {
					  console.log(`没有找到代码块 JSON 文件: ${jsonFilePath}`);
					  // 可能需要触发代码识别来生成JSON
					  if (message.needCodeRecognition) {
						console.log('文件打开时自动触发代码识别');
						// 自动触发代码识别 - 将相关代码从runCodeRecognition命令处理程序复制到这里
						// ...代码识别逻辑...
					  }
					}
				  } catch (err) {
					// 安全地获取错误信息
					const errorMessage = err instanceof Error ? err.message : String(err);
					console.error('打开文件失败:', err);
					panel?.webview.postMessage({ command: 'error', error: errorMessage });
					vscode.window.showErrorMessage(`打开文件失败: ${errorMessage}`);
				  }
				  break;
				}
				case 'runCodeBlock':
				try {
					const { code, language } = message;
					// 这里只以 python 为例，其他语言可自行扩展
					if (language === 'Python') {
						const tmpPath = path.join(context.extensionPath, 'cr_out', 'tmp_run.py');
						fs.writeFileSync(tmpPath, code, 'utf-8');
						exec(`python "${tmpPath}"`, (error, stdout, stderr) => {
							if (error) {
								console.log('发送 runCodeResult:', { result: stderr || error.message, blockIdx: message.blockIdx });
								panel?.webview.postMessage({ 
									command: 'runCodeResult', 
									result: stderr || error.message, 
									blockIdx: message.blockIdx 
								});
							} else {
								console.log('发送 runCodeResult:', { result: stdout, blockIdx: message.blockIdx });
								panel?.webview.postMessage({ 
									command: 'runCodeResult', 
									result: stdout, 
									blockIdx: message.blockIdx 
								});
							}
						});
					}
					else if (language === 'C') {
						const tmpPath = path.join(context.extensionPath, 'cr_out', 'tmp_run.c');
						fs.writeFileSync(tmpPath, code, 'utf-8');
						exec(`gcc "${tmpPath}"\n ./a.exe`, (error, stdout, stderr) => {
							if (error) {
								console.log('发送 runCodeResult:', { result: stderr || error.message, blockIdx: message.blockIdx });
								panel?.webview.postMessage({ 
									command: 'runCodeResult', 
									result: stderr || error.message, 
									blockIdx: message.blockIdx 
								});
							} else {
								console.log('发送 runCodeResult:', { result: stdout, blockIdx: message.blockIdx });
								panel?.webview.postMessage({ 
									command: 'runCodeResult', 
									result: stdout, 
									blockIdx: message.blockIdx 
								});
							}
						});
					}
					else if (language === 'C++') {
						const tmpPath = path.join(context.extensionPath, 'cr_out', 'tmp_run.cpp');
						fs.writeFileSync(tmpPath, code, 'utf-8');
						exec(`g++ "${tmpPath}"\n ./a.exe`, (error, stdout, stderr) => {
							if (error) {
								console.log('发送 runCodeResult:', { result: stderr || error.message, blockIdx: message.blockIdx });
								panel?.webview.postMessage({ 
									command: 'runCodeResult', 
									result: stderr || error.message, 
									blockIdx: message.blockIdx 
								});
							}
							else {
								console.log('发送 runCodeResult:', { result: stdout, blockIdx: message.blockIdx });
								panel?.webview.postMessage({ 
									command: 'runCodeResult', 
									result: stdout, 
									blockIdx: message.blockIdx 
								});
							}
						});
					}
					else if (language === 'Java') {
						const match = code.match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/);
						let tmpPath = path.join(context.extensionPath, 'cr_out');
    					if (match && match[1]) {
							tmpPath = path.join(tmpPath, match[1], '.java');
						}
						fs.writeFileSync(tmpPath, code, 'utf-8');
						exec(`javac "${tmpPath}"\n java -cp "${path.dirname(tmpPath)}" "${path.basename(tmpPath, '.java')}"`, (error, stdout, stderr) => {
							if (error) {
								console.log('发送 runCodeResult:', { result: stderr || error.message, blockIdx: message.blockIdx });
								panel?.webview.postMessage({ 
									command: 'runCodeResult', 
									result: stderr || error.message, 
									blockIdx: message.blockIdx 
								});
							}
							else {
								console.log('发送 runCodeResult:', { result: stdout, blockIdx: message.blockIdx });
								panel?.webview.postMessage({ 
									command: 'runCodeResult', 
									result: stdout, 
									blockIdx: message.blockIdx 
								});
							}
						});
					}
					else {
						console.log('发送 runCodeResult:', { result: '暂不支持该语言运行', blockIdx: message.blockIdx });
						panel?.webview.postMessage({ 
							command: 'runCodeResult', 
							result: '暂不支持该语言运行', 
							blockIdx: message.blockIdx 
						});
					}
				} catch (err: any) {
					console.log('发送 runCodeResult:', { result: err.message, blockIdx: message.blockIdx });
					panel?.webview.postMessage({ 
						command: 'runCodeResult', 
						result: err.message, 
						blockIdx: message.blockIdx 
					});
				}
				break;
				case 'generateSummary':
					try {
						const summary = await generateAISummary(message.filePath);
						panel?.webview.postMessage({ command: 'aiSummaryResult', content: summary });
					} catch (error: any) {
						panel?.webview.postMessage({ command: 'aiError', error: error.message });
					}
					break;

				case 'generateSummaryAndSave':
					try {
						// 1. 调用 LLM 生成 Markdown 文本
						const summaryMd = await generateAISummary(message.filePath);

						// 2. 拿到 PDF 的绝对路径
						const absPdf = await getFileAbsolutePath(message.filePath);
						const dir    = path.dirname(absPdf);
						const name   = path.parse(absPdf).name;
						const mdPath = path.join(dir, `${name}.md`);

						// 3. 写入 .md 文件
						await fs.promises.writeFile(mdPath, summaryMd, 'utf8');

						// 4. 在编辑器中打开它
						const doc = await vscode.workspace.openTextDocument(mdPath);
						await vscode.window.showTextDocument(doc);

						// 5. 通知前端
						panel?.webview.postMessage({
						command: 'saveSummaryResult',
						success: true,
						mdPath
						});
					} catch (err: any) {
						panel?.webview.postMessage({
						command: 'saveSummaryResult',
						success: false,
						error: err.message
						});
					}
					break;
			
				case 'generateQuiz':
					try {
						const quiz = await generateAIQuiz(message.filePath);
						panel?.webview.postMessage({ command: 'aiQuizResult', content: quiz });
					} catch (error: any) {
						panel?.webview.postMessage({ command: 'aiError', error: error.message });
					}
					break;
				case 'getPdfPath':
					try {
						const absolutePath = await getFileAbsolutePath(message.path);
						console.log("File's Absolute Path is: "+absolutePath);
						const pdfPath = vscode.Uri.file(absolutePath);
						const pdfUri = panel?.webview.asWebviewUri(pdfPath);
						console.log("path: "+pdfUri?.toString());
						panel?.webview.postMessage({ command: 'PdfPath', path: pdfUri?.toString() });
						console.log("finish command getPdfPath ----");
					} catch (error: any) {
						panel?.webview.postMessage({ command: 'error', error: error.message });
					}
					break;
				case 'getDemoPdfPath':
					try {
						// const demoPdfPath = path.join(context.extensionPath, 'dist', 'assets', 'sample.pdf');
						const demoPdfPath = vscode.Uri.joinPath(context.extensionUri, 'dist', 'assets', 'sample.pdf');
						const demoPdfUri = panel?.webview.asWebviewUri(demoPdfPath);
						panel?.webview.postMessage({ command: 'demoPdfPath', filePath: demoPdfUri?.toString() });
					} catch (error: any) {
						panel?.webview.postMessage({ command: 'error', error: error.message });
					}
					break;
				case 'getPdfWorkerPath':
					try {
						// const PdfWorkerPath = path.join(context.extensionPath, 'dist', 'assets', 'pdf.worker.min.js');
						const PdfWorkerPath = vscode.Uri.joinPath(context.extensionUri, 'dist', 'assets', 'pdf.worker.min.js');
						const PdfWorkerUri = panel?.webview.asWebviewUri(PdfWorkerPath);
						panel?.webview.postMessage({ command: 'PdfWorkerPath', path: PdfWorkerUri?.path });
					} catch (error: any) {
						panel?.webview.postMessage({ command: 'error', error: error.message });
					}
					break;
				case 'login':
					try {
						const { email, password } = message;
						const { data, error } = await supabase
						.from('users')
						.select('id, name, email, role, password')
						.eq('email', email)
						.single();

						if (error || !data) {
						panel?.webview.postMessage({
							command: 'loginResult',
							success: false,
							error: '用户不存在或数据库错误'
						});
						} else if (data.password !== password) {
						panel?.webview.postMessage({
							command: 'loginResult',
							success: false,
							error: '密码错误'
						});
						} else {
						currentUserId = data.id;
						// Store currentUserId in persistent storage
						await context.globalState.update('currentUserId', currentUserId);
						panel?.webview.postMessage({
							command: 'loginResult',
							success: true,
							user: {
							id: data.id,
							name: data.name,
							email: data.email,
							role: data.role
							}
						});
						console.log('✅ 使用自建 users 表登录成功，用户 ID:', currentUserId);
						}
					} catch (err: any) {
						panel?.webview.postMessage({
						command: 'loginResult',
						success: false,
						error: err.message
						});
					}
					break;
				// 替换 register 逻辑（message.command === 'register'）
				case 'register':
				try {
					const { name, email, password } = message;
					console.log('收到的注册数据：', message);
					// 检查邮箱是否已存在
					const { data: exist, error: checkError } = await supabase
					.from('users')
					.select('id')
					.eq('email', email)
					.maybeSingle();

					if (exist) {
					panel?.webview.postMessage({
						command: 'registerResult',
						success: false,
						error: '该邮箱已被注册'
					});
					} else {
					const { data: newUser, error: insertError } = await supabase
						.from('users')
						.insert({ name, email, password, role: 'student'})
						.select('id, name, email, role, password')
						.single();

					if (insertError || !newUser) {
						panel?.webview.postMessage({
						command: 'registerResult',
						success: false,
						error: insertError?.message || '注册失败'
						});
					} else {
						currentUserId = newUser.id;
						panel?.webview.postMessage({
						command: 'registerResult',
						success: true,
						user: newUser
						});
						console.log('✅ 使用自建 users 表注册成功，用户 ID:', currentUserId);
					}
					}
				} catch (err: any) {
					panel?.webview.postMessage({
					command: 'registerResult',
					success: false,
					error: err.message
					});
				}
				break;

				// —— 注销 ——
				case 'logout':
				currentUserId = null;
				// Clear currentUserId from persistent storage
				await context.globalState.update('currentUserId', null);
				panel?.webview.postMessage({
					command: 'logoutResult',
					success: true
				});
				break;

				// —— 获取当前登录用户 ID ——
				case 'getCurrentUserid':
				panel?.webview.postMessage({
					command: 'currentUseridResult',
					success: true,
					userId: currentUserId
				});
				break;
				//获取所有好友，用于添加好友
				case 'getUsers':
					try {
						const { data, error } = await supabase
							.from('users')
							.select('id, name, email, role')
							.order('id', { ascending: true });

						if (error) {
							panel?.webview.postMessage({
								command: 'getUsersResult',
								success: false,
								error: error.message
							});
						} else {
							panel?.webview.postMessage({
								command: 'getUsersResult',
								success: true,
								users: data
							});
						}
					} catch (err: any) {
						panel?.webview.postMessage({
							command: 'getUsersResult',
							success: false,
							error: err.message
						});
					}
					break;
				//删除好友关系
				case 'deleteUser':
					try {
						const userId = parseInt(message.userId);
						
						if (isNaN(userId)) {
							panel?.webview.postMessage({
								command: 'deleteUserResult',
								success: false,
								error: '无效的用户 ID'
							});
							return;
						}

                            const {data, error} = await supabase
                                .from('users')
                                .delete()
                                .eq('id', userId)
                                .select();

                            if (error) {
                                panel?.webview.postMessage({
                                    command: 'deleteUserResult',
                                    success: false,
                                    error: error.message
                                });
                                return;
                            }

                            if (data.length === 0) {
                                panel?.webview.postMessage({
                                    command: 'deleteUserResult',
                                    success: false,
                                    error: '用户不存在'
                                });
                                return;
                            }

                            panel?.webview.postMessage({
                                command: 'deleteUserResult',
                                success: true,
                                message: '用户删除成功',
                                user: data[0]
                            });
                        } catch (err: any) {
                            panel?.webview.postMessage({
                                command: 'deleteUserResult',
                                success: false,
                                error: err.message
                            });
                        }
                        break;
                    case 'getFriendsList':
                        try {
                            const userId = message.userId;

                            if (!userId) {
                                panel?.webview.postMessage({
                                    command: 'getFriendsListResult',
                                    success: false,
                                    error: '用户ID不能为空'
                                });
                                return;
                            }

                            const {data, error} = await supabase
                                .from('friends')
                                .select(`
								friend_id,
								users:friend_id (id, name)
							`)
                                .eq('user_id', userId);

                            if (error) {
                                panel?.webview.postMessage({
                                    command: 'getFriendsListResult',
                                    success: false,
                                    error: error.message
                                });
                                return;
                            }

                            const friends = data.map((item: any) => ({
                                id: item.users.id,
                                name: item.users.name,
                                type: 'friend'
                            }));

                            console.log('friends: ', friends)
                            panel?.webview.postMessage({
                                command: 'getFriendsListResult',
                                success: true,
                                friends: friends
                            });
                        } catch (err: any) {
                            panel?.webview.postMessage({
                                command: 'getFriendsListResult',
                                success: false,
                                error: err.message
                            });
                        }
                        break;
                    case 'newFriend':
                        try {
                            const {currentUserId, friendId} = message;

                            if (!currentUserId || !friendId) {
                                panel?.webview.postMessage({
                                    command: 'newFriendResult',
                                    success: false,
                                    error: 'currentUserId 和 friendId 是必需的'
                                });
                                return;
                            }

                            // 插入好友关系（双向）
                            const {error: error1} = await supabase
                                .from('friends')
                                .insert([
                                    {user_id: currentUserId, friend_id: friendId},
                                    {user_id: friendId, friend_id: currentUserId}
                                ]);

                            if (error1 && !error1.message.includes('duplicate key')) {
                                panel?.webview.postMessage({
                                    command: 'newFriendResult',
                                    success: false,
                                    error: error1.message
                                });
                                return;
                            }

                            // 查询 friendId 对应的用户名
                            const {data, error: error2} = await supabase
                                .from('users')
                                .select('name')
                                .eq('id', friendId)
                                .single();

                            if (error2) {
                                panel?.webview.postMessage({
                                    command: 'newFriendResult',
                                    success: false,
                                    error: error2.message
                                });
                                return;
                            }

                            const friendName = data?.name || `用户${friendId}`;

                            panel?.webview.postMessage({
                                command: 'newFriendResult',
                                success: true,
                                friend: {
                                    id: `${currentUserId}-${friendId}`,
                                    name: friendName,
                                    type: 'friend',
                                    members: [currentUserId, friendId]
                                }
                            });
                        } catch (err: any) {
                            panel?.webview.postMessage({
                                command: 'newFriendResult',
                                success: false,
                                error: err.message
                            });
                        }
                        break;
                    case 'getGroupList':
                        try {
                            const userId = message.userId;

                            if (!userId) {
                                panel?.webview.postMessage({
                                    command: 'getGroupListResult',
                                    success: false,
                                    error: '用户ID不能为空'
                                });
                                return;
                            }

                            const {data, error} = await supabase
                                .from('group_members')
                                .select(`
								group_id,
								groups (
									id,
									name,
									owner
								)
							`)
                                .eq('member_id', userId);

                            if (error) {
                                panel?.webview.postMessage({
                                    command: 'getGroupListResult',
                                    success: false,
                                    error: error.message
                                });
                                return;
                            }

                            // 整理格式：将 group_members + groups 转为纯 group 列表
                            const groups = data.map((item: any) => ({
                                id: item.groups.id,
                                name: item.groups.name,
                                type: 'group',
                                groupOwner: item.groups.owner
                            }));

                            console.log('groups: ', groups)
                            panel?.webview.postMessage({
                                command: 'getGroupListResult',
                                success: true,
                                groups: groups
                            });
                        } catch (err: any) {
                            panel?.webview.postMessage({
                                command: 'getGroupListResult',
                                success: false,
                                error: err.message
                            });
                        }
                        break;
                    case 'createGroup':
                        try {
                            let {name, userIds, ownerId} = message;
                            userIds = Array.from(new Set(
                                userIds
                                    .map((id: string | number) => Number(id))
                                    .filter((id: number) => !isNaN(id))  // 移除无效的 NaN
                            ));

                            console.log(userIds)
                            // 参数校验
                            if (!name || !Array.isArray(userIds) || userIds.length < 2 || !ownerId) {
                                panel?.webview.postMessage({
                                    command: 'createGroupResult',
                                    success: false,
                                    error: '缺少群聊名称、成员列表或群主 ID'
                                });
                                return;
                            }

                            // 插入 groups 表
                            const {data: groupData, error: insertGroupError} = await supabase
                                .from('groups')
                                .insert([{name, owner: ownerId}])
                                .select()
                                .single();

                            if (insertGroupError) {
                                console.log('create group fail insert group!!!!')

                                panel?.webview.postMessage({
                                    command: 'createGroupResult',
                                    success: false,
                                    error: insertGroupError.message
                                });
                                return;
                            }
                            const group = groupData;

                            // 插入 group_members（防止重复）
                            const memberRows = userIds.map((userId: number) => ({
                                group_id: group.id,
                                member_id: userId,
                            }));

                            const {error: insertMembersError} = await supabase
                                .from('group_members')
                                .upsert(memberRows, {onConflict: 'group_id,member_id'});

                            if (insertMembersError) {
                                console.log(memberRows)
                                console.log('create group fail insert member !!!!')
                                panel?.webview.postMessage({
                                    command: 'createGroupResult',
                                    success: false,
                                    error: insertMembersError.message
                                });
                                return;
                            }

                            // 查询用户信息
                            const {data: memberUsers, error: userQueryError} = await supabase
                                .from('users')
                                .select('id, name, email, role')
                                .in('id', userIds);

                            if (userQueryError) {
                                console.log('create group fail query member !!!!')
                                panel?.webview.postMessage({
                                    command: 'createGroupResult',
                                    success: false,
                                    error: userQueryError.message
                                });
                                return;
                            }

                            console.log('create group success!!!!')
                            panel?.webview.postMessage({
                                command: 'createGroupResult',
                                success: true,
                                group: {
                                    id: group.id,
                                    name: group.name,
                                    type: 'group',
                                    groupOwner: group.owner,
                                    members: memberUsers
                                }
                            });
                        } catch (err: any) {
                            panel?.webview.postMessage({
                                command: 'createGroupResult',
                                success: false,
                                error: err.message
                            });
                        }
                        break;
                    case 'getFriendMessages':
                        try {
                            const {userId, friendId} = message;

                            if (!userId || !friendId) {
                                panel?.webview.postMessage({
                                    command: 'getFriendMessagesResult',
                                    success: false,
                                    error: '用户ID和好友ID不能为空'
                                });
                                return;
                            }

                            const {data, error} = await supabase
                                .from('friend_message')
                                .select(`
								text,
								time,
								sender,
								users:sender (id, name, email, role)
							`)
                                .or(`sender.eq.${userId},sender.eq.${friendId}`)
                                .or(`receiver.eq.${userId},receiver.eq.${friendId}`)
                                .order('time', {ascending: true});

                            if (error) {
                                panel?.webview.postMessage({
                                    command: 'getFriendMessagesResult',
                                    success: false,
                                    error: error.message
                                });
                                return;
                            }

                            const messages = data.map((msg: any) => ({
                                text: msg.text,
                                time: msg.time,
                                sender_name: msg.users?.name || `用户${msg.sender}`,
                                sender_id: msg.users?.id || msg.sender,
                                sender_email: msg.users?.email || '',
                                sender_role: msg.users?.role || ''
                            }));

                            panel?.webview.postMessage({
                                command: 'getFriendMessagesResult',
                                success: true,
                                messages: messages
                            });
                        } catch (err: any) {
                            panel?.webview.postMessage({
                                command: 'getFriendMessagesResult',
                                success: false,
                                error: err.message
                            });
                        }
                        break;
                    case 'sendFriendsMessage':
                        try {
                            const {sender, receiver, text} = message;

                            if (!sender || !receiver || !text) {
                                panel?.webview.postMessage({
                                    command: 'sendFriendsMessageResult',
                                    success: false,
                                    error: '发送者、接收者和消息内容不能为空'
                                });
                                return;
                            }

                            const {data, error} = await supabase
                                .from('friend_message')
                                .insert([
                                    {sender, receiver, text}
                                ])
                                .select()
                                .single();

                            if (error) {
                                panel?.webview.postMessage({
                                    command: 'sendFriendsMessageResult',
                                    success: false,
                                    error: error.message
                                });
                                return;
                            }

                            panel?.webview.postMessage({
                                command: 'sendFriendsMessageResult',
                                success: true,
                                message: data
                            });
                        } catch (err: any) {
                            panel?.webview.postMessage({
                                command: 'sendFriendsMessageResult',
                                success: false,
                                error: err.message
                            });
                        }
                        break;
                    case 'getGroupMessages':
                        try {
                            const {groupId} = message;

                            if (!groupId) {
                                panel?.webview.postMessage({
                                    command: 'getGroupMessagesResult',
                                    success: false,
                                    error: '群组ID不能为空'
                                });
                                return;
                            }

                            const {data, error} = await supabase
                                .from('group_message')
                                .select(`
								text,
								time,
								sender,
								users:sender (id, name, email, role)
							`)
                                .eq('group_id', groupId)
                                .order('time', {ascending: true});

                            if (error) {
                                panel?.webview.postMessage({
                                    command: 'getGroupMessagesResult',
                                    success: false,
                                    error: error.message
                                });
                                return;
                            }

                            const messages = data.map((msg: any) => ({
                                text: msg.text,
                                time: msg.time,
                                sender_name: msg.users?.name || `用户${msg.sender}`,
                                sender_id: msg.users?.id || msg.sender,
                                sender_email: msg.users?.email || '',
                                sender_role: msg.users?.role || ''
                            }));

                            panel?.webview.postMessage({
                                command: 'getGroupMessagesResult',
                                success: true,
                                messages: messages
                            });
                        } catch (err: any) {
                            panel?.webview.postMessage({
                                command: 'getGroupMessagesResult',
                                success: false,
                                error: err.message
                            });
                        }
                        break;
                    case 'sendGroupMessage':
                        try {
                            const {group_id, sender, text} = message;

                            if (!group_id || !sender || !text) {
                                panel?.webview.postMessage({
                                    command: 'sendGroupMessageResult',
                                    success: false,
                                    error: '群组ID、发送者和消息内容不能为空'
                                });
                                return;
                            }

                            const {data, error} = await supabase
                                .from('group_message')
                                .insert([
                                    {group_id, sender, text}
                                ])
                                .select()
                                .single();

                            if (error) {
                                panel?.webview.postMessage({
                                    command: 'sendGroupMessageResult',
                                    success: false,
                                    error: error.message
                                });
                                return;
                            }

                            panel?.webview.postMessage({
                                command: 'sendGroupMessageResult',
                                success: true,
                                message: data
                            });
                        } catch (err: any) {
                            panel?.webview.postMessage({
                                command: 'sendGroupMessageResult',
                                success: false,
                                error: err.message
                            });
                        }
                        break;
                    case 'getProjects':
                        try {
                            const projects = await getProjects();
                            panel?.webview.postMessage({command: 'projectsData', projects});
                        } catch (error: any) {
                            panel?.webview.postMessage({command: 'error', error: error.message});
                        }
                        break;
                    case 'getGroupTasks':
                        try {
                            const groupId = message.groupId;
                            if (!groupId) {
                                panel?.webview.postMessage({
                                    command: 'getGroupTasksResult',
                                    success: false,
                                    error: '未提供群组 ID'
                                });
                                return;
                            }

                            interface TaskWithRelations {
                                id: number;
                                title: string;
                                details: string | null;
                                due_date: string;
                                status: string;
                                priority: string;
                                completion: boolean;
                                group_id: number | null;
                                assignee_id: number | null;
                                groups: { id: number; name: string } | null;
                                users: { id: number; name: string } | null;
                            }

                            const {data, error} = await supabase
                                .from('tasks')
                                .select(`
                                    id,
                                    title,
                                    details,
                                    due_date,
                                    status,
                                    priority,
                                    completion,
                                    group_id,
                                    assignee_id,
                                    groups:group_id (
                                        id,
                                        name
                                    ),
                                    users:assignee_id (
                                        id,
                                        name
                                    )
                                `)
                                .eq('group_id', groupId)
                                .order('due_date', { ascending: true });

                            if (error) {
                                panel?.webview.postMessage({
                                    command: 'getGroupTasksResult',
                                    success: false,
                                    error: error.message
                                });
                                return;
                            }

                            // Transform the data to include group and assignee names
                            const tasks = ((data as unknown) as TaskWithRelations[]).map(task => ({
                                ...task,
                                group_name: task.groups?.name || null,
                                assignee_name: task.users?.name || null,
                                groups: undefined, // Remove the nested objects
                                users: undefined
                            }));

                            panel?.webview.postMessage({
                                command: 'getGroupTasksResult',
                                success: true,
                                tasks: tasks
                            });
                        } catch (error: any) {
                            panel?.webview.postMessage({
                                command: 'getGroupTasksResult',
                                success: false,
                                error: error.message
                            });
                        }
                        break;
                        //////////////
                    case 'getGroupUsers':
                        try {
                            const groupId = message.groupId;
                            if (!groupId) {
                                panel?.webview.postMessage({
                                    command: 'getGroupUsersResult',
                                    success: false,
                                    error: '未提供群组 ID'
                                });
                                return;
                            }

                            const {data, error} = await supabase
                                .from('group_members')
                                .select(`
                                    member_id,
                                    users:member_id (
                                        id,
                                        name,
                                        email,
                                        role
                                    )
                                `)
                                .eq('group_id', groupId);

                            if (error) {
                                panel?.webview.postMessage({
                                    command: 'getGroupUsersResult',
                                    success: false,
                                    error: error.message
                                });
                                return;
                            }

                            // Transform the data to get only user information
                            const users = data.map((item: any) => ({
                                id: item.users.id,
                                name: item.users.name,
                                email: item.users.email,
                                role: item.users.role
                            }));

                            panel?.webview.postMessage({
                                command: 'getGroupUsersResult',
                                success: true,
                                users: users
                            });
                        } catch (error: any) {
                            panel?.webview.postMessage({
                                command: 'getGroupUsersResult',
                                success: false,
                                error: error.message
                            });
                        }
                        break;


                        ///////////////////////
                        
                    default:
                        vscode.window.showInformationMessage(`未识别的命令: ${message.command}`);
                        console.log(`未识别的命令: ${message.command}`);
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
}

function getCatWebviewContent() {
    return `
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
export function deactivate() {
}
