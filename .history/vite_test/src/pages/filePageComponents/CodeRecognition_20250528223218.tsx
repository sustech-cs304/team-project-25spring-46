/*
 * @Author: hatfail 1833943280@qq.com
 * @Date: 2025-05-12 23:24:27
 * @LastEditors: hatfail 1833943280@qq.com
 * @LastEditTime: 2025-05-27 22:42:52
 * @FilePath: \team-project-25spring-46\vite_test\src\pages\filePageComponents\CodeRecognition.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { getVsCodeApi } from '../../vscodeApi';
import { CompilerSelector } from './CompilerSelector';

export interface CodeBlock {
    x: number;
    y: number;
    width: number;
    height: number;
    language: string;
    content: string;
    page: number;
}

interface CodeRecognitionProps {
    filePath: string;
}

// 代码块展示组件
const CodeBlockDisplay = ({ 
    code, 
    language, 
    page, 
    onRunCode, 
    onOpenInEditor,
    isRunning,
    runResult 
}: { 
    code: string;
    language: string;
    page?: number;
    onRunCode?: () => void;
    onOpenInEditor?: () => void;
    isRunning?: boolean;
    runResult?: string;
}) => (
    <div className="bg-white border rounded-lg shadow-lg p-4">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
                {language || 'Unknown'} 代码 {page ? `(Page ${page})` : ''}
            </h3>
            {onRunCode && (
                <div className="flex space-x-2">
                    {onOpenInEditor && (
                        <button
                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                            onClick={onOpenInEditor}
                        >
                            在编辑器中打开
                        </button>
                    )}
                    <button
                        className={`${
                            isRunning ? 'bg-gray-500' : 'bg-green-500 hover:bg-green-600'
                        } text-white px-3 py-1 rounded transition-colors flex items-center space-x-1`}
                        onClick={onRunCode}
                        disabled={isRunning}
                    >
                        {isRunning ? (
                            <>
                                <span className="animate-spin">⟳</span>
                                <span>运行中...</span>
                            </>
                        ) : (
                            '运行代码'
                        )}
                    </button>
                </div>
            )}
        </div>
        <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-[200px] bg-gray-50 p-2 rounded">
            {code}
        </pre>
        {runResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                <div className="text-sm font-semibold mb-2">运行结果：</div>
                <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-48">
                    {runResult}
                </pre>
            </div>
        )}
    </div>
);

export function CodeRecognition({ filePath }: CodeRecognitionProps) {
    const vscode = getVsCodeApi();
    const [selectedCompiler, setSelectedCompiler] = useState<string>('');
    const [codeBlocks, setCodeBlocks] = useState<CodeBlock[]>([]);
    const [hoveredBlock, setHoveredBlock] = useState<number | null>(null);
    const [editingBlock, setEditingBlock] = useState<number | null>(null);
    const [runResult, setRunResult] = useState<string>("");
    const [recognitionDone, setRecognitionDone] = useState(false);
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [availableCompilers, setAvailableCompilers] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });
    const [currentPage, setCurrentPage] = useState(1);

    const pdfRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    // 更新 PDF 尺寸的函数
    const updatePdfDimensions = useCallback(() => {
        if (pdfRef.current) {
            const { offsetWidth, offsetHeight } = pdfRef.current;
            setPdfDimensions({
                width: offsetWidth,
                height: offsetHeight
            });
        }
    }, []);

    // 监听 PDF 容器尺寸变化
    useEffect(() => {
        updatePdfDimensions();

        // 创建 ResizeObserver 来监听尺寸变化
        const resizeObserver = new ResizeObserver(updatePdfDimensions);
        if (pdfRef.current) {
            resizeObserver.observe(pdfRef.current);
        }

        // 监听窗口尺寸变化
        window.addEventListener('resize', updatePdfDimensions);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updatePdfDimensions);
        };
    }, [updatePdfDimensions]);

    // 重置状态当文件路径改变时
    useEffect(() => {
        setRecognitionDone(false);
        setIsRecognizing(false);
        setCodeBlocks([]);
        updatePdfDimensions();
    }, [filePath, updatePdfDimensions]);

    // 监听代码块数据和编译器信息
    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const { command, data, error } = event.data;
            let compilers: string[] = [];
            
            switch (command) {
                case 'recognitionStarted':
                    setIsRecognizing(true);
                    setRecognitionDone(false);
                    setCodeBlocks([]);
                    break;

                case 'recognitionCompleted':
                    setIsRecognizing(false);
                    setRecognitionDone(true);
                    break;

                case 'recognitionError':
                    setIsRecognizing(false);
                    setRecognitionDone(false);
                    vscode.postMessage({ 
                        command: 'showError', 
                        message: `代码识别失败: ${error}` 
                    });
                    break;

                case 'pdfCodeBlocks':
                    try {
                        const rawBlocks = JSON.parse(data);
                        // 转换为前端需要的格式
                        const parsedBlocks = rawBlocks.map((block: { position: number[], language: string, code: string, page: number }) => ({
                            x: block.position[0],
                            y: block.position[1],
                            width: block.position[2],
                            height: block.position[3],
                            language: block.language,
                            content: block.code,
                            page: block.page
                        }));
                        setCodeBlocks(parsedBlocks);
                
                        // 获取第一个代码块的语言类型的编译器
                        if (parsedBlocks.length > 0 && parsedBlocks[0].language) {
                            vscode.postMessage({
                                command: 'getAvailableCompilers',
                                language: parsedBlocks[0].language
                            });
                        }
                    } catch (error) {
                        console.error('Error parsing code blocks:', error);
                        setCodeBlocks([]);
                        vscode.postMessage({ 
                            command: 'showError', 
                            message: '解析代码块数据失败' 
                        });
                    }
                    break;

                case 'availableCompilers':
                    compilers = data.compilers || [];
                    setAvailableCompilers(compilers);
                    if (compilers.length > 0) {
                        setSelectedCompiler(compilers[0]);
                    }
                    break;

                case 'runCodeResult':
                    setRunResult(data.result || '');
                    setIsRunning(false);
                    break;
            }
        };

        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    // 按页面组织代码块
    const codeBlocksByPage = useCallback(() => {
        const blocksByPage: { [key: number]: CodeBlock[] } = {};
        codeBlocks.forEach(block => {
            const page = block.page || 1;
            if (!blocksByPage[page]) {
                blocksByPage[page] = [];
            }
            blocksByPage[page].push(block);
        });
        return blocksByPage;
    }, [codeBlocks]);

    // 计算代码块位置
    const getBlockPosition = useCallback((block: CodeBlock) => {
        // If container dimensions are not set (e.g., initially 0),
        // render blocks with 0 size to prevent misplacement or flicker.
        // They will be correctly positioned once pdfDimensions are updated.
        if (pdfDimensions.width === 0 || pdfDimensions.height === 0) {
            return { left: 0, top: 0, width: 0, height: 0 };
        }

        // Assuming block.x, block.y, block.width, block.height are normalized (0-1 range)
        // relative to the PDF page or overall document dimensions.
        const calculatedLeft = block.x * pdfDimensions.width;
        const calculatedTop = block.y * pdfDimensions.height;
        const calculatedWidth = block.width * pdfDimensions.width;
        const calculatedHeight = block.height * pdfDimensions.height;

        return {
            left: Math.round(calculatedLeft),
            top: Math.round(calculatedTop),
            width: Math.max(Math.round(calculatedWidth), 50), // Ensure minimum visual/clickable width
            height: Math.max(Math.round(calculatedHeight), 20) // Ensure minimum visual/clickable height
        };
    }, [pdfDimensions]);

    // 计算提示框位置
    const getTooltipPosition = useCallback((block: CodeBlock) => {
        const blockPos = getBlockPosition(block);
        const { width: containerWidth } = pdfDimensions;
        
        // 根据容器宽度调整提示框宽度
        const tooltipWidth = Math.min(400, containerWidth * 0.8);
        
        // 计算水平位置
        let left = blockPos.left;
        if (left + tooltipWidth > containerWidth) {
            left = containerWidth - tooltipWidth - 10;
        }
        if (left < 10) left = 10;

        return {
            left,
            top: blockPos.top,
            width: tooltipWidth
        };
    }, [pdfDimensions, getBlockPosition]);

    // 运行代码
    const handleRunCode = (blockIdx: number) => {
        if (codeBlocks[blockIdx]) {
            const block = codeBlocks[blockIdx];
            setIsRunning(true);
            setRunResult('');
            vscode.postMessage({
                command: 'runCode',
                code: block.content,
                language: block.language || 'python',
                compiler: selectedCompiler
            });
        }
    };

    // 在编辑器中打开代码
    const handleOpenInEditor = (blockIdx: number) => {
        if (codeBlocks[blockIdx]) {
            const block = codeBlocks[blockIdx];
            vscode.postMessage({
                command: 'openCodeInEditor',
                code: block.content,
                language: block.language || 'python',
                blockIdx
            });
        }
    };

    return (
        <div style={{background: 'yellow', minHeight: 100}}>
            HELLO DEBUG
            <div className="bg-white shadow p-4 rounded-xl" style={{ position: 'relative' }}>
                <h2 className="text-xl font-semibold mb-4">🧠 代码识别</h2>
                <button
                    className={`${
                        isRecognizing ? 'bg-gray-500' : 'bg-indigo-500 hover:bg-indigo-600'
                    } text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2`}
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
                            <span>代码识别运行中...</span>
                        </>
                    ) : (
                        <>
                            <span>🚀</span>
                            <span>运行代码识别</span>
                        </>
                    )}
                </button>

                {isRecognizing && (
                    <div className="mt-4 flex items-center space-x-2 text-blue-600">
                        <span className="animate-spin">⟳</span>
                        <span>正在识别文档中的代码...</span>
                    </div>
                )}

                {recognitionDone && !isRecognizing && (
                    <div className="mt-2 flex items-center space-x-2 text-green-600 font-semibold">
                        <span>✓</span>
                        <span>
                            文档中的代码已识别完成
                            {codeBlocks.length > 0 && ` (发现 ${codeBlocks.length} 个代码块)`}
                        </span>
                    </div>
                )}

                <div 
                    ref={pdfRef} 
                    className="relative mt-4 border rounded-lg overflow-hidden"
                    style={{ 
                        width: '100%', 
                        minHeight: '500px',
                        height: pdfDimensions.height || '500px'
                    }}
                >
                    {/* 悬停提示 */}
                    {hoveredBlock !== null && codeBlocks[hoveredBlock] && (
                        <div
                            ref={tooltipRef}
                            className="absolute z-50 bg-white border rounded-lg shadow-lg"
                            style={{
                                ...getTooltipPosition(codeBlocks[hoveredBlock]),
                                maxHeight: '80vh',
                                overflow: 'auto'
                            }}
                        >
                            <CodeBlockDisplay
                                code={codeBlocks[hoveredBlock].content}
                                language={codeBlocks[hoveredBlock].language}
                                page={codeBlocks[hoveredBlock].page}
                            />
                        </div>
                    )}

                    {/* 代码块区域 - 按页面显示 */}
                    {Object.entries(codeBlocksByPage()).map(([page, blocks]) => (
                        <div 
                            key={page}
                            className="absolute inset-0"
                            style={{
                                display: Number(page) === currentPage ? 'block' : 'none'
                            }}
                        >
                            {blocks.map((block, idx) => {
                                const position = getBlockPosition(block);
                                const globalIdx = codeBlocks.indexOf(block);
                                return (
                                    <div
                                        key={idx}
                                        style={{
                                            position: 'absolute',
                                            left: position.left,
                                            top: position.top,
                                            width: position.width,
                                            height: position.height,
                                            border: '2px solid red',
                                            background: 'rgba(255,0,0,0.1)',
                                            zIndex: 1000,
                                            pointerEvents: 'auto'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.stopPropagation();
                                            setHoveredBlock(globalIdx);
                                        }}
                                        onMouseLeave={(e) => {
                                            e.stopPropagation();
                                            setHoveredBlock(null);
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingBlock(globalIdx);
                                            vscode.postMessage({
                                                command: 'getAvailableCompilers',
                                                language: block.language || 'python'
                                            });
                                        }}
                                        title={`点击编辑 ${block.language || ''} 代码`}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setEditingBlock(globalIdx);
                                                vscode.postMessage({
                                                    command: 'getAvailableCompilers',
                                                    language: block.language || 'python'
                                                });
                                            }
                                        }}
                                    >
                                        {block.language}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* 编辑框 */}
                {editingBlock !== null && codeBlocks[editingBlock] && (
                    <div
                        className="fixed right-5 top-5 bg-white rounded-lg shadow-xl border"
                        style={{
                            width: '500px',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            zIndex: 1100,
                        }}
                    >
                        <div className="p-4">
                            <div className="mb-4">
                                <CompilerSelector
                                    language={codeBlocks[editingBlock].language || 'Unknown'}
                                    onCompilerChange={setSelectedCompiler}
                                    availableCompilers={availableCompilers}
                                />
                            </div>

                            <CodeBlockDisplay
                                code={codeBlocks[editingBlock].content}
                                language={codeBlocks[editingBlock].language}
                                page={codeBlocks[editingBlock].page}
                                onRunCode={() => handleRunCode(editingBlock)}
                                onOpenInEditor={() => handleOpenInEditor(editingBlock)}
                                isRunning={isRunning}
                                runResult={runResult}
                            />
                        </div>

                        <button
                            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                            onClick={() => setEditingBlock(null)}
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* 页面导航 */}
                {Object.keys(codeBlocksByPage()).length > 1 && (
                    <div className="flex justify-center mt-4 space-x-2">
                        {Object.keys(codeBlocksByPage()).map((page) => (
                            <button
                                key={page}
                                className={`px-3 py-1 rounded ${
                                    currentPage === Number(page)
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200 hover:bg-gray-300'
                                }`}
                                onClick={() => setCurrentPage(Number(page))}
                            >
                                第 {page} 页
                            </button>
                        ))}
                    </div>
                )}

                <pre>{JSON.stringify(codeBlocks, null, 2)}</pre>
                <pre>{JSON.stringify(pdfDimensions)}</pre>
                <pre>{JSON.stringify({currentPage, codeBlocks: codeBlocksByPage()[currentPage]})}</pre>
            </div>
        </div>
    );
}