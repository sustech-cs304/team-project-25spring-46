import * as vscode from 'vscode';
import * as path from 'path';
import axios from 'axios';

const fs = require('fs');
const pdf = require('pdf-parse');

export function showWebviewPanel(context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel(
        'aiSummarizer',
        'AI 课程总结',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    console.log('📄 Webview 已创建');

    panel.webview.html = getWebviewContent();

    panel.webview.onDidReceiveMessage(async (message) => {
        console.log('📩 收到前端消息:', message);

        if (message.type === 'summarizePdf' || message.type === 'generateQuiz') {
            const fileUri = await vscode.window.showOpenDialog({
                canSelectMany: false,
                filters: { PDF: ['pdf'] },
                openLabel: '选择课件 PDF 文件'
            });

            if (!fileUri) {
                console.log('⚠️ 用户未选择任何文件');
                return;
            }

            const filePath = fileUri[0].fsPath;
            console.log('📂 选择的文件路径:', filePath);

            try {
                const pdfBuffer = fs.readFileSync(filePath);
                const pdfText = (await pdf(pdfBuffer)).text;
                console.log('📃 PDF 内容长度:', pdfText.length);

                let prompt = '';

                if (message.type === 'summarizePdf') {
                    prompt = `请逐页解析以下课件内容，总结要点，分级提炼为 Markdown 课程笔记，并补充课程思路导图（知识图谱或思维导图），格式使用 Markdown：${pdfText}`;
                } else if (message.type === 'generateQuiz') {
                    prompt = `请根据以下课件内容，出 5 道 quiz（可以是选择题或填空题），用 JSON 数组格式返回，每题应包含：题干、选项（如有）、参考答案、解析。例如：
[
  {
    "question": "xxx?",
    "options": ["A.xxx", "B.xxx", "C.xxx"],
    "answer": "B",
    "explanation": "正确答案是 B，因为..."
  }
]
以下是课件内容：${pdfText}`;
                }

                const response = await queryLLM(prompt);

                if (message.type === 'generateQuiz') {
                    const quizArray = extractQuizJSON(response);
                    console.log('📤 正在向 Webview 发送 quiz 数组：', quizArray);
                    panel.webview.postMessage({ type: 'showQuiz', content: quizArray });

                    // ✅ 保存 quiz 到本地 JSON 文件
                    const fileName = path.basename(filePath, '.pdf');
                    const quizOutputPath = path.join(
                        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || context.extensionPath,
                        `${fileName}.quiz.json`
                    );
                    fs.writeFileSync(quizOutputPath, JSON.stringify(quizArray, null, 2), 'utf-8');
                    console.log('✅ Quiz 已保存为 JSON 文件:', quizOutputPath);
                    vscode.window.showInformationMessage(`Quiz 已保存为 ${fileName}.quiz.json`);

                } else {
                    const outputPath = path.join(
                        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || context.extensionPath,
                        '课程总结.md'
                    );
                    fs.writeFileSync(outputPath, response, 'utf-8');
                    vscode.window.showInformationMessage('课程总结已生成并保存为 Markdown 文件');
                    vscode.workspace.openTextDocument(outputPath).then(doc => vscode.window.showTextDocument(doc));
                    panel.webview.postMessage({ type: 'showMd', content: response });
                }

            } catch (err) {
                console.error('❌ 处理出错:', err);
                vscode.window.showErrorMessage('AI 请求失败，请查看控制台日志');
            }
        }
    });
}

async function queryLLM(prompt: string): Promise<string> {
    const apiKey = 'your api key.';
    const endpoint = 'https://api5.xhub.chat/v1/chat/completions';

    try {
        console.log('📡 正在请求大模型 API...');
        console.log('📝 Prompt 预览：', prompt.substring(0, 200), '...');

        const response = await axios.post(endpoint, {
            model: 'gpt-3.5-turbo-0125',
            messages: [
                { role: 'system', content: '你是一个有帮助的助手。' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ 大模型返回成功，字符数:', response.data.choices[0].message.content.length);
        return response.data.choices[0].message.content.trim();

    } catch (error: any) {
        console.error('❌ 请求大模型失败：', error.message);
        if (error.response) {
            console.error('❌ 错误响应状态码：', error.response.status);
            console.error('❌ 错误响应内容：', error.response.data);
        }
        throw error;
    }
}

function extractQuizJSON(raw: string): any[] {
    const match = raw.trim().match(/\[.*\]/s); // 匹配最外层 JSON 数组
    if (!match) {return [];}
    try {
        return JSON.parse(match[0]);
    } catch (err) {
        console.error('❌ JSON 解析失败:', err);
        return [];
    }
}

function getWebviewContent(): string {
    return `
    <!DOCTYPE html>
    <html lang="zh">
    <head>
        <meta charset="UTF-8">
        <title>AI 课程总结</title>
        <style>
            body { font-family: sans-serif; padding: 20px; }
            button { padding: 10px 20px; font-size: 16px; margin-right: 10px; }
            pre { background: #f4f4f4; padding: 10px; white-space: pre-wrap; }
        </style>
    </head>
    <body>
        <h1>AI 课程助手</h1>
        <button onclick="start()">📚 生成总结</button>
        <button onclick="generateQuiz()">🧠 生成测试题</button>

        <h2>总结结果 (Markdown)</h2>
        <pre id="result"></pre>

        <div id="quizSection" style="margin-top: 30px;"></div>

        <script>
            const vscode = acquireVsCodeApi();

            function start() {
                document.getElementById('result').textContent = '⏳ 正在输出中，请稍候...';
                document.getElementById('quizSection').innerHTML = '';
                vscode.postMessage({ type: 'summarizePdf' });
            }

            function generateQuiz() {
                document.getElementById('result').textContent = '';
                document.getElementById('quizSection').innerHTML = '⏳ 正在生成测试题，请稍候...';
                vscode.postMessage({ type: 'generateQuiz' });
            }

            document.addEventListener('DOMContentLoaded', () => {
                window.addEventListener('message', event => {
                    const message = event.data;
                    console.log('📥 Webview 收到消息:', message);

                    if (message.type === 'showMd') {
                        document.getElementById('result').textContent = message.content;
                    }

                    if (message.type === 'showQuiz') {
                        const quizData = message.content;
                        if (!Array.isArray(quizData)) {
                            document.getElementById('quizSection').innerHTML =
                                '<pre>⚠️ 不是合法的 quiz 数组：' +
                                JSON.stringify(quizData, null, 2) + '</pre>';
                            return;
                        }
                        document.getElementById('quizSection').innerHTML = renderQuiz(quizData);
                    }
                });
            });

            function renderQuiz(quizArray) {
                let html = '<h2>📝 测试题</h2><form id="quizForm">';
                quizArray.forEach((q, index) => {
                    html += \`<div style="margin-bottom: 20px;">
                        <strong>Q\${index + 1}: \${q.question}</strong><br/>\`;

                    if (q.options) {
                        q.options.forEach((opt, i) => {
                            const optId = \`q\${index}_opt\${i}\`;
                            html += \`<label><input type="radio" name="q\${index}" value="\${opt}" id="\${optId}"/> \${opt}</label><br/>\`;
                        });
                    } else {
                        html += \`<input type="text" name="q\${index}" style="width: 80%;" placeholder="请输入答案"><br/>\`;
                    }

                    html += \`<div id="explanation_q\${index}" style="margin-top: 5px;"></div></div>\`;
                });

                html += \`<button type="button" onclick="submitAnswers(\${quizArray.length}, \${JSON.stringify(quizArray).replace(/"/g, '&quot;')})">提交答案</button></form>\`;
                return html;
            }

            function submitAnswers(total, quizArrayRaw) {
                const quizArray = quizArrayRaw;
                for (let i = 0; i < total; i++) {
                    const q = quizArray[i];
                    const input = document.querySelector(\`input[name="q\${i}"]:checked\`)?.value ||
                                  document.querySelector(\`input[name="q\${i}"]\`)?.value;
                    const box = document.getElementById(\`explanation_q\${i}\`);
                    if (!input) {
                        box.textContent = '⚠️ 未作答';
                        box.style.color = 'gray';
                        continue;
                    }
                    if (input.trim().toLowerCase() === q.answer.trim().toLowerCase()) {
                        box.textContent = \`✅ 正确！解析：\${q.explanation}\`;
                        box.style.color = 'green';
                    } else {
                        box.textContent = \`❌ 错误，正确答案是：\${q.answer}。解析：\${q.explanation}\`;
                        box.style.color = 'red';
                    }
                }
            }
        </script>
    </body>
    </html>`;
}
