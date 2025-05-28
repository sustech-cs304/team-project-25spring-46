import React, { useState } from 'react';
import { useSidePanel } from './SidePanelContext';
import { usePDFMetrics } from './PDFViewer';
import { CodeSnippetData } from '../types/annotations';

interface Props {
  data: CodeSnippetData[];
  page?: number; // 新增
}

const CodeAnnotation: React.FC<Props> = ({ data: snippets, page }) => {
  const pageMetrics = usePDFMetrics();
  const { openPanel } = useSidePanel();
  const [openId, setOpenId] = useState<string | null>(null);

  const handleClick = (snippet: CodeSnippetData) => {
    const id = snippet.id;
    setOpenId(prev => prev === id ? null : id);
    openPanel({
      id,
      type: 'code',
      code: snippet.content,
      language: ''
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(err => console.error('复制失败:', err));
  };

  // 只渲染当前页的代码块
  const filteredSnippets = page
    ? snippets.filter(snippet => snippet.page === page)
    : snippets;

  return (
    <>
      {filteredSnippets.map(snippet => {
        const metric = pageMetrics[snippet.page - 1];
        if (!metric) return null;

        // 修改点在此：正确地解构对象
        const { id, content, position: { x, y, width, height } } = snippet;

        const left = x * metric.width;
        const top = metric.offsetY + y * metric.height;
        const w = width * metric.width;
        const h = height * metric.height;
        const isOpen = openId === id;

        return (
          <React.Fragment key={id}>
            <div
              style={{ position: 'absolute', left, top, width: w, height: h }}
              className="bg-green-200 bg-opacity-30 border border-green-500 cursor-pointer"
              onClick={() => handleClick(snippet)}
            >
              <span style={{ pointerEvents: 'none' }}>&lt;/&gt;</span>
            </div>
            {isOpen && (
              <div
                style={{ position: 'absolute', left, top: top + h + 4, width: Math.max(w, 200) }}
                className="bg-white border border-gray-300 shadow-lg p-2 z-10"
              >
                <div className="flex justify-between items-center mb-1">
                  <strong className="text-xs text-gray-700">代码片段</strong>
                  <button className="text-xs text-gray-500 hover:text-gray-800" onClick={() => setOpenId(null)}>
                    关闭
                  </button>
                </div>
                <pre
                  contentEditable
                  suppressContentEditableWarning
                  className="bg-gray-100 p-2 text-xs overflow-auto"
                  style={{ maxHeight: '150px' }}
                >
                  {content}
                </pre>
                <div className="text-right mt-1">
                  <button className="text-xs text-blue-500 hover:underline mr-2" onClick={() => copyToClipboard(content)}>
                    复制
                  </button>
                  <button className="text-xs text-green-600 hover:underline" onClick={() => alert('保存已提交')}>
                    保存
                  </button>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

export default CodeAnnotation;
