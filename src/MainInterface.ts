import * as vscode from 'vscode';
import { createNewCourse, CourseInfo } from './CourseManager';

export function showMainInterface(context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel(
        'mainInterface',
        '课程资源管理 - 主界面',
        vscode.ViewColumn.One,
        {
            enableScripts: true
        }
    );

    panel.webview.html = getHtmlForWebview();

    panel.webview.onDidReceiveMessage(async message => {
        switch (message.command) {
            case 'newCourse':
                {
                    const courseInfo: CourseInfo | undefined = await createNewCourse();
                    if (courseInfo) {
                        // 将新课程记录到 globalState 中
                        let storedCourses = context.globalState.get<{ name: string, path: string }[]>('courses') || [];
                        if (!storedCourses.find(c => c.path === courseInfo.uri.fsPath)) {
                            storedCourses.push({ name: courseInfo.name, path: courseInfo.uri.fsPath });
                            context.globalState.update('courses', storedCourses);
                        }
                        // 通知 webview 刷新课程列表
                        panel.webview.postMessage({ command: 'updateCourses', courses: storedCourses });
                    }
                }
                break;
            case 'listCourses':
                {
                    const storedCourses = context.globalState.get<{ name: string, path: string }[]>('courses') || [];
                    panel.webview.postMessage({ command: 'updateCourses', courses: storedCourses });
                }
                break;
            case 'openCourse':
                {
                    const coursePath: string = message.coursePath;
                    vscode.commands.executeCommand('courseIDE.openExistingCourse', coursePath);
                }
                break;
            case 'setDeadline':
                {

                    const coursePath = message.coursePath;

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

                        let storedCourses = context.globalState.get<{ name: string, path: string, deadline?: string }[]>('courses') || [];

                        const courseIndex = storedCourses.findIndex(c => c.path === coursePath);

                        if (courseIndex !== -1) {

                            storedCourses[courseIndex].deadline = deadline;

                            context.globalState.update('courses', storedCourses);

                            panel.webview.postMessage({ command: 'updateCourses', courses: storedCourses });

                            vscode.window.showInformationMessage(`已为 "${storedCourses[courseIndex].name}" 设置截止日期: ${deadline}`);

                        }

                    }

                }

                break;
            case 'addFileWithDeadline':
                {
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
                                panel.webview.postMessage({ command: 'updateFiles', files: storedFiles });
                            }
                        }
                    }
                }
                break;
        }
    });
}

function getHtmlForWebview(): string {
    return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <!-- 添加 Content-Security-Policy 确保脚本执行 -->
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' vscode-resource:; style-src 'unsafe-inline' vscode-resource:;">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>课程资源管理</title>
        <style>
            .course-item { 
                display: flex; 
                align-items: center; 
                margin: 5px 0; 
            }
            .deadline-btn {
                margin-left: 10px;
                padding: 2px 8px;
                cursor: pointer;
            }
            .deadline-text {
                margin-left: 10px;
                color: #666;
            }
            .file-item {
                margin: 5px 0;
            }
        </style>
    </head>
    <body>
        <h1>欢迎使用课程资源管理插件</h1>
        <p>本插件提供统一的课程资源管理功能，支持新建课程、查看已有课程以及预览课程资源等。</p>
        <button id="btnNewCourse">新建课程</button>
        <button id="btnListCourses">查看已有课程</button>
        <button id="btnAddFile">添加文件并设置截止日期</button>
        <div id="coursesList"></div>
        <div id="filesList"></div>
        <script>
            const vscode = acquireVsCodeApi();
            document.getElementById('btnNewCourse').addEventListener('click', () => {
                vscode.postMessage({ command: 'newCourse' });
            });
            document.getElementById('btnListCourses').addEventListener('click', () => {
                vscode.postMessage({ command: 'listCourses' });
            });
            document.getElementById('btnAddFile').addEventListener('click', () => {
                vscode.postMessage({ command: 'addFileWithDeadline' });
            });
            
            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'updateCourses') {
                    const coursesList = document.getElementById('coursesList');
                    coursesList.innerHTML = '<h2>已有课程</h2>';
                    if (message.courses.length === 0) {
                        coursesList.innerHTML += '<p>暂无课程，请点击“新建课程”创建。</p>';
                    } else {
                        const ul = document.createElement('ul');
                        message.courses.forEach(course => {
                            const li = document.createElement('li');
                            li.className = 'course-item';
                            
                            const courseLink = document.createElement('span');
                            courseLink.textContent = course.name + ' (' + course.path + ')';
                            courseLink.style.cursor = 'pointer';
                            courseLink.addEventListener('click', () => {
                                vscode.postMessage({ command: 'openCourse', coursePath: course.path });
                            });
                            
                            const deadlineBtn = document.createElement('button');
                            deadlineBtn.textContent = '设置截止日期';
                            deadlineBtn.className = 'deadline-btn';
                            deadlineBtn.addEventListener('click', () => {
                                vscode.postMessage({ command: 'setDeadline', coursePath: course.path });
                            });
                            
                            li.appendChild(courseLink);
                            li.appendChild(deadlineBtn);
                            
                            if (course.deadline) {
                                const deadlineSpan = document.createElement('span');
                                deadlineSpan.textContent = '截止日期: ' + course.deadline;
                                deadlineSpan.className = 'deadline-text';
                                li.appendChild(deadlineSpan);
                            }
                            
                            ul.appendChild(li);
                        });
                        coursesList.appendChild(ul);
                    }
                } else if (message.command === 'updateFiles') {
                    const filesList = document.getElementById('filesList');
                    filesList.innerHTML = '<h2>文件与截止日期</h2>';
                    if (message.files.length === 0) {
                        filesList.innerHTML += '<p>暂无文件。</p>';
                    } else {
                        const ul = document.createElement('ul');
                        message.files.forEach(file => {
                            const li = document.createElement('li');
                            li.className = 'file-item';
                            li.textContent = file.path + ' (截止日期: ' + file.deadline + ')';
                            ul.appendChild(li);
                        });
                        filesList.appendChild(ul);
                    }
                }
            });
            // 页面加载时自动请求课程列表
            vscode.postMessage({ command: 'listCourses' });
        </script>
    </body>
    </html>
    `;
}