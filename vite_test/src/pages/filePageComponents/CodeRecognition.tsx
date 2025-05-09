import { useState } from 'react';
import { getVsCodeApi } from '../../vscodeApi';

interface CodeFile {
    path: string;
    content: string;
}

interface CodeRecognitionProps {
    filePath: string;
}

export function CodeRecognition({ filePath }: CodeRecognitionProps) {
    const vscode = getVsCodeApi();
    const [showCode, setShowCode] = useState(false);
    // const [codeFiles, setCodeFiles] = useState<CodeFile[]>([]);
    const [codeFiles] = useState<CodeFile[]>([]);

    const runCodeRecognition = () => {
        if (vscode) {
            vscode.postMessage({ command: 'runCodeRecognition', filePath });
            setShowCode(true);
        }
    };

    return (
        <div className="bg-white shadow p-4 rounded-xl">
            <h2 className="text-xl font-semibold mb-4">🧠 代码识别</h2>
            <button
                className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600"
                onClick={runCodeRecognition}
            >
                🚀 运行代码识别
            </button>

            {showCode && (
                <div className="mt-4">
                    {codeFiles.length ? (
                        codeFiles.map((code, idx) => {
                            let formattedContent = "";

                            try {
                                const lines = JSON.parse(code.content);
                                formattedContent = Array.isArray(lines) ? lines.join("\n") : code.content;
                            } catch {
                                formattedContent = code.content;
                            }

                            return (
                                <div key={idx} className="bg-gray-100 rounded p-4 mb-2">
                                    <p className="font-bold mb-2">{code.path}</p>
                                    <pre className="overflow-auto max-h-64 whitespace-pre-wrap">
                                        <code>{formattedContent}</code>
                                    </pre>
                                </div>
                            );
                        })
                    ) : (
                        "正在运行代码识别..."
                    )}
                </div>
            )}
        </div>
    );
} 