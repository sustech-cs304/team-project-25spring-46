import { useEffect, useState, useRef } from 'react';
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
    interface CodeBlock {
        x: number;
        y: number;
        width: number;
        height: number;
        content: string;
        // add other properties if needed
    }
    const [codeBlocks, setCodeBlocks] = useState<CodeBlock[]>([]);
    const [hoveredBlock, setHoveredBlock] = useState<number | null>(null);
    const [editingBlock, setEditingBlock] = useState<number | null>(null);
    //监听打开pdf文件的信号并设置codeblock
    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const { command, data } = event.data;
            if (command === 'pdfCodeBlocks') {
                try {
                    setCodeBlocks(JSON.parse(data));
                } catch {
                    setCodeBlocks([]);
                }
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    const [pageWidth, setPageWidth] = useState(0);
    const [pageHeight, setPageHeight] = useState(0);
    const pdfRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (pdfRef.current) {
            setPageWidth(pdfRef.current.offsetWidth);
            setPageHeight(pdfRef.current.offsetHeight);
        }
    }, [/* 依赖于PDF加载完成 */]);

    return (
        <div className="bg-white shadow p-4 rounded-xl" style={{ position: 'relative' }}>
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
            <div ref={pdfRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* 悬停提示 */}
            {hoveredBlock !== null && codeBlocks[hoveredBlock] && (
                <div style={{
                    position: 'absolute',
                    left: codeBlocks[hoveredBlock].x * pageWidth,
                    top: codeBlocks[hoveredBlock].y * pageHeight - 30,
                    background: '#fff',
                    border: '1px solid #ccc',
                    padding: 4,
                    zIndex: 10,
                    minWidth: 200,
                    maxWidth: 400,
                    pointerEvents: 'none'
                }}>
                    <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                        {codeBlocks[hoveredBlock].content}
                    </pre>
                </div>
            )}

            {/* 编辑框 */}
            {editingBlock !== null && codeBlocks[editingBlock] && (
                <div style={{
                    position: 'absolute',
                    left: codeBlocks[editingBlock].x * pageWidth,
                    top: codeBlocks[editingBlock].y * pageHeight + codeBlocks[editingBlock].height * pageHeight + 10,
                    background: '#fff',
                    border: '1px solid #ccc',
                    padding: 8,
                    zIndex: 20,
                    minWidth: 300,
                    maxWidth: 600
                }}>
                    <textarea
                        value={codeBlocks[editingBlock].content}
                        onChange={e => {
                            const newBlocks = [...codeBlocks];
                            newBlocks[editingBlock].content = e.target.value;
                            setCodeBlocks(newBlocks);
                        }}
                        rows={20}
                        cols={100}
                        style={{ width: '100%' }}
                    />
                    <div style={{ marginTop: 8, textAlign: 'right' }}>
                        <button
                            className="bg-blue-500 text-white px-3 py-1 rounded mr-2"
                            onClick={() => setEditingBlock(null)}
                        >关闭</button>
                    </div>
                </div>
            )}

            {codeBlocks.length > 0 && (
                <div>
                    {codeBlocks.map((block, idx) => (
                        <div
                            key={idx}
                            style={{
                                position: 'absolute',
                                left: block.x * pageWidth,
                                top: block.y * pageHeight,
                                width: block.width * pageWidth,
                                height: block.height * pageHeight,
                                background: hoveredBlock === idx ? 'rgba(0,0,255,0.1)' : 'transparent',
                                cursor: 'pointer',
                            }}
                            onMouseEnter={() => setHoveredBlock(idx)}
                            onMouseLeave={() => setHoveredBlock(null)}
                            onClick={() => setEditingBlock(idx)}
                            title="点击编辑代码"
                        />
                    ))}
                </div>
            )}
            </div>
        </div>
    );
}