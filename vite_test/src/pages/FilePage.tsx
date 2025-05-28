// pages/FilePage.tsx
import { useState, useEffect } from "react";
import { getVsCodeApi } from '../vscodeApi';
import { AIAssistant } from './filePageComponents/AIAssistant';
import { Comments } from './filePageComponents/Comments';
import { Resources } from './filePageComponents/Resources';

// 定义代码块类型（根据需要调整）
export interface CodeBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  language: string;
  content: string;
  page: number;
}

export default function FilePage({ filePath, onView }: { filePath: string; onView: () => void }) {
    console.log("Now loading FilePath:", filePath);
    const vscode = getVsCodeApi();
    const files = ["Lecture1.pdf", "Lecture2.pdf", "Lecture3.pdf"];
    const [selectedFile, setSelectedFile] = useState(files[0]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [fileDetails, setFileDetails] = useState<any | null>(null);

    // 代码识别状态
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [recognitionDone, setRecognitionDone] = useState(false);
    const [runResult, setRunResult] = useState("");
    const [codeBlocks, setCodeBlocks] = useState<CodeBlock[]>([]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (message.command === 'fileDetails') {
                setFileDetails(message.details);
            } else if (message.command === 'error') {
                console.error("出错：", message.error);
            }
            // 监听代码识别相关消息
            else if (message.command === 'recognitionStarted') {
                setIsRecognizing(true);
                setRecognitionDone(false);
                setCodeBlocks([]);
            } else if (message.command === 'recognitionCompleted') {
                setIsRecognizing(false);
                setRecognitionDone(true);
            } else if (message.command === 'pdfCodeBlocks') {
                try {
                    const rawBlocks = typeof message.data === 'string'
                        ? JSON.parse(message.data)
                        : message.data;
                    console.log("解析后的代码块:", rawBlocks);
                    setCodeBlocks(rawBlocks);
                } catch (err) {
                    console.error("解析代码块数据失败:", err);
                }
            } else if (message.command === 'runCodeResult') {
                setRunResult(message.data.result || '');
            }
        };

        window.addEventListener('message', handleMessage);
        if (vscode) {
            vscode.postMessage({ command: 'getFileDetails', filePath });
        }
        return () => window.removeEventListener('message', handleMessage);
    }, [filePath, vscode]);

    if (!vscode) {
        return <div className="p-10 text-center text-red-500">无法加载 VSCode API，请确认环境。</div>;
    }

    return (
        <div className="max-w-3xl mx-auto space-y-10">
            <h1 className="text-3xl font-bold text-center mt-6">📄 文件详情</h1>

            {/* 文件名选择器 */}
            <div className="flex flex-col items-center">
                <label className="mb-2 font-medium">当前文件：</label>
                <select
                    value={selectedFile}
                    onChange={(e) => setSelectedFile(e.target.value)}
                    className="border p-2 rounded-md w-full max-w-sm"
                >
                    {files.map((file) => (
                        <option key={file} value={file}>
                            {file}
                        </option>
                    ))}
                </select>
                {fileDetails && (
                    <p className="text-sm text-gray-600 mt-2">
                        文件大小：{fileDetails.size}，类型：{fileDetails.type}，上传时间：{fileDetails.uploadedAt}
                    </p>
                )}
            </div>

            {/* 文件打开按钮 */}
            <div className="flex justify-center space-x-4">
                <button
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl text-lg hover:bg-blue-700"
                    onClick={() => {
                        vscode.postMessage({ 
                          command: 'openFile', 
                          filePath,
                          needCodeRecognition: true
                        });
                        onView();
                      }}
                >
                    🔍 查看文件
                </button>
                <button
                    className={`${
                        isRecognizing ? 'bg-gray-500' : 'bg-green-600 hover:bg-green-700'
                    } text-white px-6 py-2 rounded-xl text-lg transition-colors`}
                    onClick={() => {
                        if (!isRecognizing) {
                            vscode.postMessage({ command: 'runCodeRecognition', filePath });
                        }
                    }}
                    disabled={isRecognizing}
                >
                    {isRecognizing ? (
                        <>
                            <span className="animate-spin">⟳</span>
                            <span>识别中...</span>
                        </>
                    ) : (
                        <>
                            <span>🚀</span>
                            <span>运行代码识别</span>
                        </>
                    )}
                </button>
            </div>

            {/* 显示识别状态 */}
            {isRecognizing && (
                <div className="mt-4 text-blue-600 flex items-center space-x-2">
                    <span className="animate-spin">⟳</span>
                    <span>正在识别文档中的代码...</span>
                </div>
            )}
            {recognitionDone && !isRecognizing && (
                <div className="mt-2 text-green-600 font-semibold">
                    <span>✓</span>
                    <span>
                        文档中的代码已识别完成
                        {codeBlocks.length > 0 && ` (发现 ${codeBlocks.length} 个代码块)`}
                    </span>
                </div>
            )}
            {runResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                    <div className="text-sm font-semibold mb-2">运行结果：</div>
                    <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-48">
                        {runResult}
                    </pre>
                </div>
            )}

            {/* AI助手区块 */}
            <AIAssistant filePath={filePath} />

            {/* 交流评论区 */}
            <Comments selectedFile={selectedFile} />

            {/* 相关资源区 */}
            <Resources />
        </div>
    );
}