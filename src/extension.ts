import * as vscode from 'vscode';
<<<<<<< Updated upstream
import { CourseTreeDataProvider, CourseItem } from './CourseTreeDataProvider';

=======
import * as path from 'path';
import * as fs from 'fs';
import { createNewCourse, getCourses, getCourseSubfolderFiles, getFileDetails, getFileAbsolutePath} from './courseService';
import { exec } from 'child_process';
import pool from './database';
import { generateAISummary, generateAIQuiz } from './AIsummarizer';
import { activate as activateTestCommands } from './test/testComment';
import { createNewTask,getMyTasks,getProjectTasks,updateTask,deleteTask} from './taskService';
import { getProjects } from './projectService';
import { defaultEnv, runPythonScript, runPythonCode, CondaEnv } from './python_env';
let currentUserId: number | null = null;
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
>>>>>>> Stashed changes
export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "courseIDE" is now active!');

    // 创建 TreeView，并使用自定义的 CourseTreeDataProvider 提供数据
    const treeDataProvider = new CourseTreeDataProvider();
    const treeView = vscode.window.createTreeView('courseView', { treeDataProvider });
    context.subscriptions.push(treeView);

<<<<<<< Updated upstream
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
=======
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
				vscode.Uri.file('E:/'),
				vscode.Uri.file('D:/')
			  ]
			}
		);
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

					// 发送开始识别的消息
					panel.webview.postMessage({ command: 'recognitionStarted' });

					try {
						// 确保输出目录存在
						if (!fs.existsSync(outPath)) {
							fs.mkdirSync(outPath, { recursive: true });
						}

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
						panel.webview.postMessage({ 
							command: 'pdfCodeBlocks', 
							data: jsonContent 
						});
						
						// 发送识别完成的消息
						panel.webview.postMessage({ command: 'recognitionCompleted' });
					} catch (error: any) {
						console.error('代码识别错误:', error);
						panel.webview.postMessage({ 
							command: 'recognitionError', 
							error: error.message 
						});
						vscode.window.showErrorMessage(`代码识别失败: ${error.message}`);
					}
				} catch (err: any) {
					console.error('代码识别错误:', err);
					panel.webview.postMessage({ 
						command: 'recognitionError', 
						error: err.message 
					});
					vscode.window.showErrorMessage(`代码识别失败: ${err.message}`);
				}
				break;
				case 'openFile': 
				try{
					console.log("Extension - openFile message.data:", message.data); // 添加日志
					const filePath = message.filePath;
                    vscode.window.showInformationMessage(`打开 PDF 文件: ${filePath}`);
                    try {
						const jsonFilePath = path.join(context.extensionPath, 'cr_out') + "\\" + path.parse(filePath).name + "_code_block.json";
                        const jsonContent = await vscode.workspace.fs.readFile(vscode.Uri.file(jsonFilePath));
                        const jsonString = Buffer.from(jsonContent).toString('utf-8');
                        vscode.window.showInformationMessage(`JSON 文件内容: ${jsonString}`);
                        console.log(`JSON 文件内容 for ${filePath}: ${jsonString}`);
						panel.webview.postMessage({command: 'pdfCodeBlocks', data: jsonString});
                    } catch (error) {
                        vscode.window.showErrorMessage(`无法读取 JSON 文件: ${error}`);
                    }
				}
				catch(err: any) {
					panel.webview.postMessage({command: 'error', error: err.message});
				}
				break;
				case 'runCodeBlock':
				try {
					const { code, language } = message;
					// 这里只以 python 为例，其他语言可自行扩展
					if (language === 'Python') {
						const tmpPath = path.join(context.extensionPath, 'cr_out', 'tmp_run.py');
						fs.writeFileSync(tmpPath, code, 'utf-8');
						exec(`python "${tmpPath}"`, (error, stdout, stderr) => {
							if (error) {
								panel.webview.postMessage({ command: 'runCodeBlockResult', result: stderr || error.message });
							} else {
								panel.webview.postMessage({ command: 'runCodeBlockResult', result: stdout });
							}
						});
					}
					else if (language === 'C') {
						const tmpPath = path.join(context.extensionPath, 'cr_out', 'tmp_run.c');
						fs.writeFileSync(tmpPath, code, 'utf-8');
						exec(`gcc "${tmpPath}"\n ./a.exe`, (error, stdout, stderr) => {
							if (error) {
								panel.webview.postMessage({ command: 'runCodeBlockResult', result: stderr || error.message });
							} else {
								panel.webview.postMessage({ command: 'runCodeBlockResult', result: stdout });
							}
						});
					}
					else if (language === 'C++') {
						const tmpPath = path.join(context.extensionPath, 'cr_out', 'tmp_run.cpp');
						fs.writeFileSync(tmpPath, code, 'utf-8');
						exec(`g++ "${tmpPath}"\n ./a.exe`, (error, stdout, stderr) => {
							if (error) {
								panel.webview.postMessage({ command: 'runCodeBlockResult', result: stderr || error.message });
							}
							else {
								panel.webview.postMessage({ command: 'runCodeBlockResult', result: stdout });
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
								panel.webview.postMessage({ command: 'runCodeBlockResult', result: stderr || error.message });
							}
							else {
								panel.webview.postMessage({ command: 'runCodeBlockResult', result: stdout });
							}
						});
					}
					else {
						panel.webview.postMessage({ command: 'runCodeBlockResult', result: '暂不支持该语言运行' });
					}
				} catch (err: any) {
					panel.webview.postMessage({ command: 'runCodeBlockResult', result: err.message });
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
						const pdfPath = vscode.Uri.file(absolutePath);
						const pdfUri = panel.webview.asWebviewUri(pdfPath);
						panel.webview.postMessage({ command: 'PdfPath', path: pdfUri.toString() });
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
				case 'getAvailableEnvironments':
					try {
						// 这里可以使用 which python、conda env list 等命令获取环境列表
						// 简单示例：
						exec('conda env list', (error, stdout, stderr) => {
							if (error) {
								panel.webview.postMessage({ 
								  command: 'availableEnvironments', 
								  environments: ['默认环境'] 
								});
								return;
							}
							
							// 解析 conda 环境列表
							const envs = stdout
								.split('\n')
								.filter(line => line.trim() && !line.startsWith('#'))
								.map(line => line.split(/\s+/)[0].trim())
								.filter(env => env);
							
							panel.webview.postMessage({ 
								command: 'availableEnvironments', 
								environments: envs.length ? envs : ['默认环境'] 
							});
						});
					} catch (error: any) {
						panel.webview.postMessage({ 
							command: 'availableEnvironments', 
							environments: ['默认环境'] 
						});
					}
					break;
				case 'runCode':
					try {
						const { code, language, compiler } = message;
						let command = '';
						let tmpPath = '';
						
						// 首先检查编译器是否存在
						const checkCompiler = () => {
							return new Promise<boolean>((resolve) => {
								let checkCmd = '';
								
								switch (language) {
									case 'Python':
										if (compiler && compiler !== '默认环境') {
											checkCmd = `conda env list | findstr "${compiler}"`;
										} else {
											checkCmd = 'python --version';
										}
										break;
									case 'C':
										checkCmd = 'gcc --version';
										break;
									case 'C++':
										checkCmd = 'g++ --version';
										break;
									case 'Java':
										checkCmd = 'javac -version';
										break;
									default:
										resolve(false);
										return;
								}
								
								exec(checkCmd, (error) => {
									resolve(!error);
								});
							});
						};
						
						const compilerExists = await checkCompiler();
						
						if (!compilerExists) {
							panel.webview.postMessage({ 
								command: 'runCodeResult', 
								result: `错误: 未检测到${language}所需的编译器/解释器，请安装相应的开发环境。` 
							});
							vscode.window.showErrorMessage(`未检测到${language}所需的编译器/解释器，请安装相应的开发环境。`);
							return;
						}
						
						// 编译器存在，继续执行代码
						// 保持原有的运行逻辑...
						if (language === 'Python') {
							tmpPath = path.join(context.extensionPath, 'cr_out', 'tmp_run.py');
							fs.writeFileSync(tmpPath, code, 'utf-8');
							
							// 如果有指定环境，使用 conda 运行
							if (compiler && compiler !== '默认环境') {
								command = `conda run -n ${compiler} python "${tmpPath}"`;
							} else {
								command = `python "${tmpPath}"`;
							}
						} else if (language === 'C') {
							tmpPath = path.join(context.extensionPath, 'cr_out', 'tmp_run.c');
							fs.writeFileSync(tmpPath, code, 'utf-8');
							command = `gcc "${tmpPath}" -o "${tmpPath}.exe" && "${tmpPath}.exe"`;
						} else if (language === 'C++') {
							tmpPath = path.join(context.extensionPath, 'cr_out', 'tmp_run.cpp');
							fs.writeFileSync(tmpPath, code, 'utf-8');
							command = `g++ "${tmpPath}" -o "${tmpPath}.exe" && "${tmpPath}.exe"`;
						} else if (language === 'Java') {
							// 提取类名
							const match = code.match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/);
							const className = match && match[1] ? match[1] : 'Main';
							
							tmpPath = path.join(context.extensionPath, 'cr_out', `${className}.java`);
							fs.writeFileSync(tmpPath, code, 'utf-8');
							command = `javac "${tmpPath}" && java -cp "${path.dirname(tmpPath)}" ${className}`;
						}
						
						// 运行命令
						exec(command, (error, stdout, stderr) => {
							if (error) {
								panel.webview.postMessage({ 
								  command: 'runCodeResult', 
								  result: stderr || error.message 
								});
							} else {
								panel.webview.postMessage({ 
								  command: 'runCodeResult', 
								  result: stdout 
								});
							}
						});
					} catch (error: any) {
						panel.webview.postMessage({ 
						  command: 'runCodeResult', 
						  result: `错误: ${error.message}` 
						});
					}
					break;
				case 'getAvailableCompilers':
					try {
						const { language } = message;
						let command = '';
						
						switch(language) {
							case 'Python':
								command = 'conda env list';
								exec(command, (error, stdout, stderr) => {
									if (error) {
										panel.webview.postMessage({ 
											command: 'availableCompilers', 
											language,
											compilers: ['默认环境'],
											hasCompiler: true
										});
										return;
									}
									
									// 解析 conda 环境列表
									const envs = stdout
										.split('\n')
										.filter(line => line.trim() && !line.startsWith('#'))
										.map(line => line.split(/\s+/)[0].trim())
										.filter(env => env);
									
									panel.webview.postMessage({ 
										command: 'availableCompilers', 
										language,
										compilers: envs.length ? envs : ['默认环境'],
										hasCompiler: true
									});
								});
								break;
								
							case 'C':
								// 检查 gcc 是否可用
								exec('gcc --version', (error, stdout, stderr) => {
									panel.webview.postMessage({ 
										command: 'availableCompilers', 
										language,
										compilers: ['gcc'],
										hasCompiler: !error
									});
									if (error) {
										vscode.window.showWarningMessage('未检测到 gcc 编译器，C 语言代码可能无法正常运行。');
									}
								});
								break;
								
							case 'C++':
								// 检查 g++ 是否可用
								exec('g++ --version', (error, stdout, stderr) => {
									panel.webview.postMessage({ 
										command: 'availableCompilers', 
										language,
										compilers: ['g++'],
										hasCompiler: !error
									});
									if (error) {
										vscode.window.showWarningMessage('未检测到 g++ 编译器，C++ 语言代码可能无法正常运行。');
									}
								});
								break;
								
							case 'Java':
								// 检查 javac 是否可用
								exec('javac -version', (error, stdout, stderr) => {
									panel.webview.postMessage({ 
										command: 'availableCompilers', 
										language,
										compilers: ['javac'],
										hasCompiler: !error
									});
									if (error) {
										vscode.window.showWarningMessage('未检测到 javac 编译器，Java 代码可能无法正常运行。');
									}
								});
								break;
								
							default:
								panel.webview.postMessage({ 
									command: 'availableCompilers', 
									language,
									compilers: [],
									hasCompiler: false
								});
						}
					} catch (error: any) {
						panel.webview.postMessage({ 
							command: 'availableCompilers',
							language: message.language,
							compilers: [],
							hasCompiler: false,
							error: error.message
						});
					}
					break;
				case 'openCodeInEditor': {
					const { code, language, blockIdx } = message;
					const ext = (() => {
						switch ((language || '').toLowerCase()) {
							case 'python': return 'py';
							case 'c': return 'c';
							case 'c++': return 'cpp';
							case 'java': return 'java';
							default: return 'txt';
						}
					})();
					const tmpFilePath = path.join(context.extensionPath, 'cr_out', `codeblock_${blockIdx}.${ext}`);
					fs.writeFileSync(tmpFilePath, code, 'utf-8');
					vscode.workspace.openTextDocument(tmpFilePath).then(doc => {
						vscode.window.showTextDocument(doc, { preview: false });
					});
					break;
				}
				case 'showError':
					// 显示错误消息
					vscode.window.showErrorMessage(message.message);
					break;
				case 'recognitionStarted':
					try {
						panel.webview.postMessage({ command: 'recognitionStarted' });
					} catch (error: any) {
						vscode.window.showErrorMessage(`识别开始时出错: ${error.message}`);
					}
					break;
				case 'recognitionCompleted':
					try {
						panel.webview.postMessage({ command: 'recognitionCompleted' });
					} catch (error: any) {
						vscode.window.showErrorMessage(`识别完成时出错: ${error.message}`);
					}
					break;
				case 'recognitionError':
					try {
						vscode.window.showErrorMessage(`代码识别失败: ${message.error}`);
						panel.webview.postMessage({ 
							command: 'recognitionError', 
							error: message.error 
						});
					} catch (error: any) {
						vscode.window.showErrorMessage(`处理识别错误时出错: ${error.message}`);
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
>>>>>>> Stashed changes
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
