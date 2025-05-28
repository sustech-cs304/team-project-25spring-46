/*
 * @Author: hatfail 1833943280@qq.com
 * @Date: 2025-05-28 19:53:26
 * @LastEditors: hatfail 1833943280@qq.com
 * @LastEditTime: 2025-05-28 22:40:20
 * @FilePath: \team-project-25spring-46\vite_test\src\pages\CodeBlockOverlay.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React from 'react';
import { usePDFMetrics } from './PDFViewer';
import type { CodeBlock } from './filePageComponents/CodeRecognition';
import { useSidePanel } from './SidePanelContext';

interface Props {
  codeBlocks: CodeBlock[];
  page: number;
}

const CodeBlockOverlay: React.FC<Props> = ({ codeBlocks, page }) => {
  const pageMetrics = usePDFMetrics();
  const { openPanel } = useSidePanel();
  const metric = pageMetrics[page - 1];
  if (!metric) return null;

  // 只渲染当前页的代码块
  const blocks = codeBlocks.filter(block => block.page === page);

  // 每个代码块高度
  const blockHeight = 80;
  const blockMargin = 8;

  return (
    <>
      {blocks.map((block, idx) => {
        const left = 8; // 靠左，略微内缩
        const top = metric.offsetY + idx * (blockHeight + blockMargin);
        return (
          <div
            key={idx}
            className="absolute bg-white border border-blue-300 rounded shadow px-2 py-1"
            style={{
              left,
              top,
              width: metric.width * 0.5,
              height: blockHeight,
              zIndex: 12,
              overflow: 'auto',
              cursor: 'pointer'
            }}
            title={block.language}
            onClick={() => openPanel({
              id: `code-${page}-${idx}`,
              type: 'code',
              code: block.content,
              language: block.language
            })}
          >
            <div className="text-xs font-bold text-blue-700 mb-1">{block.language}</div>
            <pre className="text-xs whitespace-pre-wrap break-all">{block.content}</pre>
          </div>
        );
      })}
    </>
  );
};

export default CodeBlockOverlay;