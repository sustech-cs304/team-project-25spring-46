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
    const [fileDetails, setFileDetails] = useState<FileDetails | null>(null);
    const [currentFilePath] = useState(filePath);

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
            vscode.postMessage({ command: 'getFileDetails', filePath: currentFilePath });
        }

        return () => window.removeEventListener('message', handleMessage);
    }, [currentFilePath, vscode]);

    if (!vscode) {
        return <div className="p-10 text-center text-red-500">无法加载 VSCode API，请确认环境。</div>;
    }

    // 从 filePath 中提取文件名
    const fileName = filePath.split('/').pop() || '';

    return (
        <div className="max-w-3xl mx-auto space-y-10">
            <h1 className="text-3xl font-bold text-center mt-6">📄 文件详情</h1>

            {/* 文件名显示 */}
            <div className="flex flex-col items-center">
                <label className="mb-2 font-medium">当前文件：</label>
                <div className="border p-2 rounded-md w-full max-w-sm bg-gray-50">
                    {fileName}
                </div>
                {fileDetails && (
                    <p className="text-sm text-gray-600 mt-2">
                        文件大小：{fileDetails.size}，类型：{fileDetails.type}，上传时间：{fileDetails.uploadedAt}
                    </p>
                )}
            </div>

            {/* 文件打开按钮 */}
            <div className="flex justify-center">
                <button
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl text-lg hover:bg-blue-700"
                    onClick={() => {
                        // 跳转到真正的 DisplayPage
                        onView();
                    }}
                >
                    🔍 查看文件
                </button>
            </div>

            {/* 代码识别区块 */}
            <CodeRecognition filePath={currentFilePath} />

            {/* AI助手区块 */}
            <AIAssistant filePath={currentFilePath} />

            {/* 交流评论区 */}
            <Comments selectedFile={fileName} />

            {/* 相关资源区 */}
            <Resources />
        </div>
    );
}