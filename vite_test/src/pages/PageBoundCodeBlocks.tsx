import React, { useEffect } from 'react';
import { usePDFMetrics } from './PDFViewer';
import type { CodeBlock } from './filePageComponents/CodeRecognition';

interface PageBoundCodeBlocksProps {
  codeBlocks: CodeBlock[];
  page: number;
  onOpenCodeEditor: (block: CodeBlock) => void;
}

const PageBoundCodeBlocks: React.FC<PageBoundCodeBlocksProps> = ({ codeBlocks, page, onOpenCodeEditor }) => {
  const pageMetrics = usePDFMetrics();
  
  // 过滤当前页面的代码块
  const pageCodeBlocks = codeBlocks.filter(block => block.page === page);
  
  // 添加调试输出以验证是否有代码块
  useEffect(() => {
    // if (pageCodeBlocks.length > 0) {
    //   console.log(`页码 ${page} 有 ${pageCodeBlocks.length} 个代码块:`, pageCodeBlocks);
    // }
  }, [page, pageCodeBlocks]);
  
  // 如果没有当前页面的代码块或者没有页面度量，则不渲染
  if (pageCodeBlocks.length === 0 || !pageMetrics[page-1]) {
    return null;
  }
  
  const metric = pageMetrics[page-1];
  
  // 调整容器样式
  return (
    <>
      {/* 代码块容器 - 固定在页面左侧 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: Math.min(metric.width * 0.25, 300), // 增大宽度
          height: metric.height,
          zIndex: 1000, // 增大z-index确保显示在PDF上方
          padding: '8px',
          overflowY: 'auto',
          backgroundColor: 'rgba(255, 255, 255, 0.95)', // 增加不透明度
          boxShadow: '2px 0 10px rgba(0,0,0,0.15)', // 添加阴影增强视觉效果
          border: '1px solid #e5e7eb', // 添加边框
        }}
      >
        <div className="font-bold text-blue-700 text-sm mb-2 border-b pb-1">第 {page} 页代码</div>
        {/* 每个页面的代码块垂直排列 */}
        <div className="space-y-3">
          {pageCodeBlocks.map((block, index) => (
            <div
              key={index}
              className="bg-white shadow-md rounded border border-blue-200 overflow-hidden"
              style={{ maxHeight: Math.min(metric.height / pageCodeBlocks.length - 20, 250) }}
            >
              <div className="flex justify-between items-center bg-blue-100 px-3 py-2 border-b border-blue-200">
                <span className="text-xs font-medium text-blue-700">{block.language || "Unknown"}</span>
                <button 
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                  onClick={() => onOpenCodeEditor(block)}
                  title="在编辑器中打开"
                >
                  编辑
                </button>
              </div>
              <pre className="text-xs p-3 overflow-auto bg-gray-50" style={{ maxHeight: '200px' }}>
                <code>{block.content}</code>
              </pre>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default PageBoundCodeBlocks;