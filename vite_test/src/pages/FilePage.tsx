// pages/FilePage.tsx
import {useState, useEffect} from "react";
import {getVsCodeApi} from '../vscodeApi';
import { CodeRecognition } from './filePageComponents/CodeRecognition';
import { AIAssistant } from './filePageComponents/AIAssistant';
import { Comments } from './filePageComponents/Comments';
import { Resources } from './filePageComponents/Resources';

interface FileDetails {
    size: string;
    type: string;
    uploadedAt: string;
    subfolder: string;
}

interface FilePageProps {
    filePath: string;
    onView: () => void;    // 新增
}

export default function FilePage({ filePath, onView }: FilePageProps) {
    console.log("Now loading FilePath:", filePath);
    const vscode = getVsCodeApi();
    const files = ["Lecture1.pdf", "Lecture2.pdf", "Lecture3.pdf"];
    const [selectedFile, setSelectedFile] = useState(files[0]);
    const [fileDetails, setFileDetails] = useState<FileDetails | null>(null);
    const [recognizing, setRecognizing] = useState(false);
    const [recognitionDone, setRecognitionDone] = useState(false);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;

            if (message.command === 'fileDetails') {
                setFileDetails(message.details);
            } else if (message.command === 'error') {
                console.error("出错：", message.error);
            }
        };

        window.addEventListener('message', handleMessage);
        if (vscode) {
            vscode.postMessage({ command: 'getFileDetails', filePath });
        }

        return () => window.removeEventListener('message', handleMessage);
    }, [filePath, vscode]);

    const handleRunRecognition = () => {
        setRecognizing(true);
        setRecognitionDone(false);
        vscode?.postMessage({ command: 'runCodeRecognition', filePath });
        // 监听识别完成消息
        const handler = (event: MessageEvent) => {
            const { command } = event.data;
            if (command === 'recognitionCompleted') {
                setRecognizing(false);
                setRecognitionDone(true);
                window.removeEventListener('message', handler);
            }
        };
        window.addEventListener('message', handler);
    };

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

            {/* 文件操作按钮区块 */}
            <div className="flex flex-col items-center gap-2 mt-6">
                <button
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl text-lg hover:bg-blue-700"
                    onClick={onView}
                >
                    🔍 查看文件
                </button>
                <button
                    className="bg-indigo-500 text-white px-6 py-2 rounded-xl text-lg hover:bg-indigo-600"
                    onClick={handleRunRecognition}
                    disabled={recognizing}
                >
                    {recognizing ? '正在识别文档中的代码块...' : '运行代码识别'}
                </button>
                {recognitionDone && <div className="text-green-600 font-semibold mt-2">文档识别已完成</div>}
            </div>

            {/* 代码识别区块 */}
            <CodeRecognition filePath={filePath} />

            {/* AI助手区块 */}
            <AIAssistant filePath={filePath} />

            {/* 交流评论区 */}
            <Comments selectedFile={selectedFile} />

            {/* 相关资源区 */}
            <Resources />
        </div>
    );
}