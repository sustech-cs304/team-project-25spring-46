import * as vscode from 'vscode';
import axios from 'axios';
import * as fs from 'fs';
import * as FormData from 'form-data';
import { fetchLectureList } from './lectureManager';

export class CommentManager {
  // constructor(private context: vscode.ExtensionContext) {}
  constructor(private extensionUri: vscode.Uri) {}

  // 初始页面：选择已有或上传课件
  public async showCommentEntryUI() {
    const panel = vscode.window.createWebviewPanel(
      'lectureCommentEntry',
      '选择课件评论',
      vscode.ViewColumn.One,
      { enableScripts: true, 
        retainContextWhenHidden: true 
      }
    );

    // const lectures = await fetchLectureList();
    // console.log('共享课件列表:', lectures);
    // const lectureOptions = lectures.map(l => `<option value="${l.url}::${l.name}">${l.name}</option>`).join('');

    let lectures: Array<{ name: string, url: string }> = [];
    try {
      lectures = await fetchLectureList();
    } catch (err) {
      console.error('fetchLectureList 报错:', err);
      vscode.window.showWarningMessage('无法获取共享课件列表，将仅显示上传入口');
      lectures = []; // 继续执行，显示后续界面
    }

    const lectureOptions = lectures.length
    ? lectures.map(l => `<option value="${l.url}::${l.name}">${l.name}</option>`).join('')
    : `<option disabled selected>暂无共享课件，请上传</option>`;

    // TODO：目前选择是从本地文件夹选择上传，能否改为直接从插件的可见列表选择？？
    // TODO：上传后如何检查是否上传成功？？上传后能否自动跳到评论界面？？
    panel.webview.html = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
          <meta charset="UTF-8">
          <!-- 添加 Content-Security-Policy 确保脚本执行 -->
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' vscode-resource:; style-src 'unsafe-inline' vscode-resource:;">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>选择课件进行评论</title>
      </head>
      <body>
          <h2>选择课件进行评论</h2>
          <div style="display: flex; gap: 50px;">
              <!-- 左侧：已有共享课件 -->
              <div>
                  <label>选择已有共享课件:</label><br>
                  <select id="lectureSelect" style="width: 300px;">
                    ${lectureOptions}
                  </select><br>
                  <button onclick="openSelected()">打开评论</button>
              </div>

              <!-- 右侧：上传本地课件 -->
              <div>
                  <label>或上传新的本地课件:</label><br>
                  <button onclick="uploadLocal()">从本地课程结构中选择课件并上传</button>
              </div>
          </div>

          <script>
              const vscode = acquireVsCodeApi();

              // 打开已选择的课件并显示评论
              function openSelected() {
                  const val = document.getElementById('lectureSelect').value;
                  if (val) {
                      const [url, name] = val.split("::");
                      vscode.postMessage({ command: 'openComment', lectureId: name, lectureUrl: url });
                  }
              }

              // 上传本地课件
              function uploadLocal() {
                  vscode.postMessage({ command: 'uploadAndComment' });
              }

              // 接收来自插件的消息
              window.addEventListener('message', event => {
                  const message = event.data;
                  if (message.command === 'updateLectures') {
                      const lecturesList = document.getElementById('lectureSelect');
                      lecturesList.innerHTML = '';  // 清空现有的选项
                      if (message.lectures.length === 0) {
                          const option = document.createElement('option');
                          option.textContent = '暂无课件，点击上传新的课件';
                          lecturesList.appendChild(option);
                      } else {
                          // 填充现有的课件选项
                          message.lectures.forEach(lecture => {
                              const option = document.createElement('option');
                              option.value = \`\${lecture.url}::\${lecture.name}\`;
                              option.textContent = lecture.name;
                              lecturesList.appendChild(option);
                          });
                      }
                  }
              });

              // 页面加载时自动请求课件列表
              vscode.postMessage({ command: 'listLectures' });
          </script>
      </body>
      </html>
    `;

    panel.webview.onDidReceiveMessage(async (msg) => {
      if (msg.command === 'openComment') {
        this.showLectureCommentUI(msg.lectureId, msg.lectureUrl);
      }

      if (msg.command === 'uploadAndComment') {
        const uris = await vscode.window.showOpenDialog({ canSelectFiles: true });
        if (!uris) {return;}

        const fsPath = uris[0].fsPath;
        const formData = new FormData();
        formData.append('lecture', fs.createReadStream(fsPath));
        try {
          // 上传文件
          const res = await axios.post('http://localhost:3000/api/lectures/upload', formData, {
            headers: formData.getHeaders()
          });
  
          // 判断上传是否成功
          if (res.status === 200 && res.data.url) {
            vscode.window.showInformationMessage('上传成功: ' + res.data.name);
            // 上传成功后，自动跳转到评论界面
            this.showLectureCommentUI(res.data.name, res.data.url);
          } else {
            vscode.window.showErrorMessage('上传失败，请重试。');
          }
        } catch (error: unknown) {
          if (axios.isAxiosError(error)) {
            // 如果是 axios 错误
            if (error.response) {
              // 请求已发出，但服务器响应了状态码
              vscode.window.showErrorMessage(`上传失败，服务器返回: ${error.response.status} - ${error.response.statusText}`);
              console.error('Response data:', error.response.data);
            } else if (error.request) {
              // 请求已发出，但没有响应
              vscode.window.showErrorMessage('上传失败，服务器无响应');
              console.error('Request data:', error.request);
            } else {
              // 发生了错误，触发了请求，但未能完成
              vscode.window.showErrorMessage('上传过程中出现未知错误');
              console.error('Error:', error.message);
            }
          } else if (error instanceof Error) {
            // 非 axios 错误类型的错误
            vscode.window.showErrorMessage('上传过程中出现错误: ' + error.message);
            console.error('Error:', error.message);
          } else {
            vscode.window.showErrorMessage('上传过程中发生未知错误');
            console.error('Unknown error:', error);
          }
        }
      }
    });
  }

  public async showLectureSelectionAndCommentUI() {
    const lectures = await fetchLectureList();
  
    const selected = await vscode.window.showQuickPick(
      lectures.map(l => ({
        label: l.name,
        description: l.url
      })),
      {
        placeHolder: '请选择一个课件进行评论'
      }
    );
  
    if (!selected) {return;}
  
    const lectureId = selected.label;  // 或者使用 URL 中的唯一部分
    const lectureUrl = selected.description;
  
    await this.showLectureCommentUI(lectureId, lectureUrl);
  }  

  public async showLectureCommentUI(lectureId: string, lectureUrl: string) {
    const panel = vscode.window.createWebviewPanel(
      'lectureComments',
      `Comments for ${lectureId}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.extensionUri, 'src', 'share', 'media'), // 允许加载 pdfjs
        ],
      }
    );

    const updateWebview = async () => {
      const comments = await this.fetchComments(lectureId);
      panel.webview.html = this.renderCommentsHtml(lectureId, lectureUrl, comments, panel.webview);
    };

    panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'addComment') {
        try {
          // 发送评论数据到后端
          const res = await axios.post('http://localhost:3000/api/comments', {
            lectureId,
            author: message.author,
            content: message.content,
            position: message.position || null
          });
    
          // 如果上传成功，刷新评论
          if (res.status === 200) {
            await updateWebview();
          } else {
            vscode.window.showErrorMessage('上传失败，状态码: ' + res.status);
          }
        } catch (error) {
          if (axios.isAxiosError(error)) {
            if (error.response) {
              // 请求已发出，服务器响应了状态码
              vscode.window.showErrorMessage(`上传失败，服务器返回: ${error.response.status} - ${error.response.statusText}`);
              console.error('Response data:', error.response.data);
            } else if (error.request) {
              // 请求已发出，但没有响应
              vscode.window.showErrorMessage('上传失败，服务器无响应');
              console.error('Request data:', error.request);
            } else {
              // 请求错误
              vscode.window.showErrorMessage('上传失败，发生了未知错误');
              console.error('Error:', error.message);
            }
          } else if (error instanceof Error) {
            // 非 axios 错误
            vscode.window.showErrorMessage('上传过程中出现错误: ' + error.message);
            console.error('Error:', error.message);
          } else {
            vscode.window.showErrorMessage('上传过程中发生未知错误');
            console.error('Unknown error:', error);
          }
        }
      }
    });

    await updateWebview();
  }

  private async fetchComments(lectureId: string): Promise<any[]> {
    const res = await axios.get(`http://localhost:3000/api/comments/${lectureId}`);
    return res.data;
  }

  private renderCommentsHtml(lectureId: string, lectureUrl: string, comments: any[], webview: vscode.Webview): string {
    const commentList = comments.map(c => `<p><strong>${c.author}</strong>: ${c.content} <em>(${new Date(c.created_at).toLocaleString()}, 第 ${c.position} 页)</em></p>`).join('');
    
    // 1. 获取 PDF.js viewer.html 的 URI（基于 extensionUri 和 webview 权限）
    const viewerPath = vscode.Uri.joinPath(
      this.extensionUri, // 确保 constructor 中有传入 this.extensionUri
      'src', 'share', 'media', 'pdfjs', 'web', 'viewer.html'
    );
    const viewerUri = webview.asWebviewUri(viewerPath);
    console.log('viewerUri:', viewerUri.toString());

    // 2. 远程 PDF 地址 encode 后作为 query 参数传入 viewer.html
    const encodedLectureUrl = encodeURIComponent(lectureUrl);
    const viewerWithFile = `${viewerUri}?file=${encodedLectureUrl}`;

    return `
      <html>
        <body>
          <h2>Lecture: ${lectureId}</h2>
          <!-- 调试：显示 PDF 路径 -->
          <p>PDF 地址调试：<a href="${viewerWithFile}" target="_blank">${viewerWithFile}</a></p>
          <!-- 用 PDF.js viewer.html 渲染 PDF -->
          <iframe src="${viewerWithFile}" width="100%" height="600px" style="border: none;"></iframe>
          <h3>Comments</h3>
          ${commentList}
          <hr />
          <input type="text" id="author" placeholder="Your name" /><br />
          <textarea id="comment" rows="4" cols="60"></textarea><br />
          <label for="pageSelect">选择页码:</label>
          <select id="pageSelect">
            ${Array.from({length: 30}, (_, i) => `<option value="${i + 1}">第 ${i + 1} 页</option>`).join('')}
          </select><br />
          <button onclick="submitComment()">Submit</button>

          <script>
            const vscode = acquireVsCodeApi();
            function submitComment() {
              const author = document.getElementById('author').value;
              const content = document.getElementById('comment').value;
              const position = document.getElementById('pageSelect').value;
              vscode.postMessage({
                command: 'addComment',
                author,
                content,
                position
              });
            }
          </script>
        </body>
      </html>
    `;
  }
}