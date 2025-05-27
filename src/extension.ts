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
						panel.webview.postMessage({ command: 'addCommentResult', success: true, data: result });
					} catch (error: any) {
						panel.webview.postMessage({ command: 'addCommentResult', success: false, error: error.message });
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
				case 'deleteComments':
					try {
						console.log('Start to delete Comment ', message.id);
						const commentIdStr = message.id;
						if (!commentIdStr) {
							panel.webview.postMessage({ command: 'deleteCommentsError', error: '未提供所需删除的评论 ID' });
							return;
						}
						const commentId = Number(commentIdStr); // 将 string 转为 number
						if (isNaN(commentId)) {
							panel.webview.postMessage({ command: 'deleteCommentsError', id: commentIdStr, error: '评论 ID 不是有效的数字' });
							return;
						}
						await deleteCommentById(commentId);
						console.log('Successfully delete the comment');
						panel.webview.postMessage({ command: 'deleteCommentsSuccess', id: commentIdStr });
					} catch (error: any) {
						panel.webview.postMessage({ command: 'deleteCommentsError', id: message.id, error: error.message });
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
						panel.webview.postMessage({
						command: 'saveSummaryResult',
						success: true,
						mdPath
						});
					} catch (err: any) {
						panel.webview.postMessage({
						command: 'saveSummaryResult',
						success: false,
						error: err.message
						});
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
						const { email, password } = message;
						const { data, error } = await supabase
						.from('users')
						.select('id, name, email, role, password')
						.eq('email', email)
						.single();

						if (error || !data) {
						panel.webview.postMessage({
							command: 'loginResult',
							success: false,
							error: '用户不存在或数据库错误'
						});
						} else if (data.password !== password) {
						panel.webview.postMessage({
							command: 'loginResult',
							success: false,
							error: '密码错误'
						});
						} else {
						currentUserId = data.id;
						// Store currentUserId in persistent storage
						await context.globalState.update('currentUserId', currentUserId);
						panel.webview.postMessage({
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
						panel.webview.postMessage({
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
					panel.webview.postMessage({
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
						panel.webview.postMessage({
						command: 'registerResult',
						success: false,
						error: insertError?.message || '注册失败'
						});
					} else {
						currentUserId = newUser.id;
						panel.webview.postMessage({
						command: 'registerResult',
						success: true,
						user: newUser
						});
						console.log('✅ 使用自建 users 表注册成功，用户 ID:', currentUserId);
					}
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
				// Clear currentUserId from persistent storage
				await context.globalState.update('currentUserId', null);
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
				//获取所有好友，用于添加好友
				case 'getUsers':
					try {
						const { data, error } = await supabase
							.from('users')
							.select('id, name, email, role')
							.order('id', { ascending: true });

						if (error) {
							panel.webview.postMessage({
								command: 'getUsersResult',
								success: false,
								error: error.message
							});
						} else {
							panel.webview.postMessage({
								command: 'getUsersResult',
								success: true,
								users: data
							});
						}
					} catch (err: any) {
						panel.webview.postMessage({
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
							panel.webview.postMessage({
								command: 'deleteUserResult',
								success: false,
								error: '无效的用户 ID'
							});
							return;
						}

						const { data, error } = await supabase
							.from('users')
							.delete()
							.eq('id', userId)
							.select();

						if (error) {
							panel.webview.postMessage({
								command: 'deleteUserResult',
								success: false,
								error: error.message
							});
							return;
						}

						if (data.length === 0) {
							panel.webview.postMessage({
								command: 'deleteUserResult',
								success: false,
								error: '用户不存在'
							});
							return;
						}

						panel.webview.postMessage({
							command: 'deleteUserResult',
							success: true,
							message: '用户删除成功',
							user: data[0]
						});
					} catch (err: any) {
						panel.webview.postMessage({
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
							panel.webview.postMessage({
								command: 'getFriendsListResult',
								success: false,
								error: '用户ID不能为空'
							});
							return;
						}

						const { data, error } = await supabase
							.from('friends')
							.select(`
								friend_id,
								users:friend_id (id, name)
							`)
							.eq('user_id', userId);

						if (error) {
							panel.webview.postMessage({
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

						panel.webview.postMessage({
							command: 'getFriendsListResult',
							success: true,
							friends: friends
						});
					} catch (err: any) {
						panel.webview.postMessage({
							command: 'getFriendsListResult',
							success: false,
							error: err.message
						});
					}
					break;
				//添加好友
				case 'newFriend':
					try {
						const { currentUserId, friendId } = message;

						if (!currentUserId || !friendId) {
							panel.webview.postMessage({
								command: 'newFriendResult',
								success: false,
								error: 'currentUserId 和 friendId 是必需的'
							});
							return;
						}

						// 插入好友关系（双向）
						const { error: error1 } = await supabase
							.from('friends')
							.insert([
								{ user_id: currentUserId, friend_id: friendId },
								{ user_id: friendId, friend_id: currentUserId }
							]);

						if (error1 && !error1.message.includes('duplicate key')) {
							panel.webview.postMessage({
								command: 'newFriendResult',
								success: false,
								error: error1.message
							});
							return;
						}

						// 查询 friendId 对应的用户名
						const { data, error: error2 } = await supabase
							.from('users')
							.select('name')
							.eq('id', friendId)
							.single();

						if (error2) {
							panel.webview.postMessage({
								command: 'newFriendResult',
								success: false,
								error: error2.message
							});
							return;
						}

						const friendName = data?.name || `用户${friendId}`;

						panel.webview.postMessage({
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
						panel.webview.postMessage({
							command: 'newFriendResult',
							success: false,
							error: err.message
						});
					}
					break;
				//获取该用户所有群聊
				case 'getGroupList':
					try {
						const userId = message.userId;

						if (!userId) {
							panel.webview.postMessage({
								command: 'getGroupListResult',
								success: false,
								error: '用户ID不能为空'
							});
							return;
						}

						const { data, error } = await supabase
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
							panel.webview.postMessage({
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

						panel.webview.postMessage({
							command: 'getGroupListResult',
							success: true,
							groups: groups
						});
					} catch (err: any) {
						panel.webview.postMessage({
							command: 'getGroupListResult',
							success: false,
							error: err.message
						});
					}
					break;
				//创建群聊
				case 'createGroup':
					try {
						const { name, userIds, ownerId } = message;

						// 参数校验
						if (!name || !Array.isArray(userIds) || userIds.length < 2 || !ownerId) {
							panel.webview.postMessage({
								command: 'createGroupResult',
								success: false,
								error: '缺少群聊名称、成员列表或群主 ID'
							});
							return;
						}

						// 插入 groups 表
						const { data: groupData, error: insertGroupError } = await supabase
							.from('groups')
							.insert([{ name, owner: ownerId }])
							.select()
							.single();

						if (insertGroupError) {
							panel.webview.postMessage({
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

						const { error: insertMembersError } = await supabase
							.from('group_members')
							.upsert(memberRows, { onConflict: 'group_id,member_id' });

						if (insertMembersError) {
							panel.webview.postMessage({
								command: 'createGroupResult',
								success: false,
								error: insertMembersError.message
							});
							return;
						}

						// 查询用户信息
						const { data: memberUsers, error: userQueryError } = await supabase
							.from('users')
							.select('id, name, email, role')
							.in('id', userIds);

						if (userQueryError) {
							panel.webview.postMessage({
								command: 'createGroupResult',
								success: false,
								error: userQueryError.message
							});
							return;
						}

						panel.webview.postMessage({
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
						panel.webview.postMessage({
							command: 'createGroupResult',
							success: false,
							error: err.message
						});
					}
					break;
				//获取私聊好友消息
				case 'getFriendMessages':
					try {
						const { userId, friendId } = message;

						if (!userId || !friendId) {
							panel.webview.postMessage({
								command: 'getFriendMessagesResult',
								success: false,
								error: '用户ID和好友ID不能为空'
							});
							return;
						}

						const { data, error } = await supabase
							.from('friend_message')
							.select(`
								text,
								time,
								sender,
								users:sender (id, name, email, role)
							`)
							.or(`sender.eq.${userId},sender.eq.${friendId}`)
							.or(`receiver.eq.${userId},receiver.eq.${friendId}`)
							.order('time', { ascending: true });

						if (error) {
							panel.webview.postMessage({
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

						panel.webview.postMessage({
							command: 'getFriendMessagesResult',
							success: true,
							messages: messages
						});
					} catch (err: any) {
						panel.webview.postMessage({
							command: 'getFriendMessagesResult',
							success: false,
							error: err.message
						});
					}
					break;
				//发送私聊消息
				case 'sendFriendsMessage':
					try {
						const { sender, receiver, text } = message;

						if (!sender || !receiver || !text) {
							panel.webview.postMessage({
								command: 'sendFriendsMessageResult',
								success: false,
								error: '发送者、接收者和消息内容不能为空'
							});
							return;
						}

						const { data, error } = await supabase
							.from('friend_message')
							.insert([
								{ sender, receiver, text }
							])
							.select()
							.single();

						if (error) {
							panel.webview.postMessage({
								command: 'sendFriendsMessageResult',
								success: false,
								error: error.message
							});
							return;
						}

						panel.webview.postMessage({
							command: 'sendFriendsMessageResult',
							success: true,
							message: data
						});
					} catch (err: any) {
						panel.webview.postMessage({
							command: 'sendFriendsMessageResult',
							success: false,
							error: err.message
						});
					}
					break;
				//获取群聊消息
				case 'getGroupMessages':
					try {
						const { groupId } = message;

						if (!groupId) {
							panel.webview.postMessage({
								command: 'getGroupMessagesResult',
								success: false,
								error: '群组ID不能为空'
							});
							return;
						}

						const { data, error } = await supabase
							.from('group_message')
							.select(`
								text,
								time,
								sender,
								users:sender (id, name, email, role)
							`)
							.eq('group_id', groupId)
							.order('time', { ascending: true });

						if (error) {
							panel.webview.postMessage({
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

						panel.webview.postMessage({
							command: 'getGroupMessagesResult',
							success: true,
							messages: messages
						});
					} catch (err: any) {
						panel.webview.postMessage({
							command: 'getGroupMessagesResult',
							success: false,
							error: err.message
						});
					}
					break;
				//发送群聊消息
				case 'sendGroupMessage':
					try {
						const { group_id, sender, text } = message;

						if (!group_id || !sender || !text) {
							panel.webview.postMessage({
								command: 'sendGroupMessageResult',
								success: false,
								error: '群组ID、发送者和消息内容不能为空'
							});
							return;
						}

						const { data, error } = await supabase
							.from('group_message')
							.insert([
								{ group_id, sender, text }
							])
							.select()
							.single();

						if (error) {
							panel.webview.postMessage({
								command: 'sendGroupMessageResult',
								success: false,
								error: error.message
							});
							return;
						}

						panel.webview.postMessage({
							command: 'sendGroupMessageResult',
							success: true,
							message: data
						});
					} catch (err: any) {
						panel.webview.postMessage({
							command: 'sendGroupMessageResult',
							success: false,
							error: err.message
						});
					}
					break;
				case 'getProjects':
				try {
				const projects = await getProjects();
				panel.webview.postMessage({ command: 'projectsData', projects });
				} catch (error: any) {
				panel.webview.postMessage({ command: 'error', error: error.message });
				}
				break;
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
