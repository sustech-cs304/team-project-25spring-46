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
    </head>
    <body>
        <h1>欢迎使用课程资源管理插件</h1>
        <p>本插件提供统一的课程资源管理功能，支持新建课程、查看已有课程以及预览课程资源等。</p>
        <button id="btnNewCourse">新建课程</button>
        <button id="btnListCourses">查看已有课程</button>
        <div id="coursesList"></div>
        <script>
            const vscode = acquireVsCodeApi();
            document.getElementById('btnNewCourse').addEventListener('click', () => {
                vscode.postMessage({ command: 'newCourse' });
            });
            document.getElementById('btnListCourses').addEventListener('click', () => {
                vscode.postMessage({ command: 'listCourses' });
            });
            
            window.addEventListener('message', event => {
                const message = event.data;
                if(message.command === 'updateCourses') {
                    const coursesList = document.getElementById('coursesList');
                    coursesList.innerHTML = '<h2>已有课程</h2>';
                    if(message.courses.length === 0) {
                        coursesList.innerHTML += '<p>暂无课程，请点击“新建课程”创建。</p>';
                    } else {
                        const ul = document.createElement('ul');
                        message.courses.forEach(course => {
                            const li = document.createElement('li');
                            li.textContent = course.name + ' (' + course.path + ')';
                            li.style.cursor = 'pointer';
                            li.addEventListener('click', () => {
                                vscode.postMessage({ command: 'openCourse', coursePath: course.path });
                            });
                            ul.appendChild(li);
                        });
                        coursesList.appendChild(ul);
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
