import React from 'react';
import type { CodeBlock } from './CodeRecognition'; // 使用统一类型

interface Props {
  codeBlocks: CodeBlock[];
  onBlockClick?: (block: CodeBlock, idx: number) => void;
}

export const CodeBlockSidebar: React.FC<Props> = ({ codeBlocks, onBlockClick }) => {
  // 按页分组
  const blocksByPage: { [page: number]: CodeBlock[] } = {};
  codeBlocks.forEach(block => {
    if (!blocksByPage[block.page]) blocksByPage[block.page] = [];
    blocksByPage[block.page].push(block);
  });

  return (
    <div style={{ width: 320, background: '#f8f8fa', padding: 8, overflowY: 'auto', height: '100%' }}>
      {Object.entries(blocksByPage).map(([page, blocks]) => (
        <div key={page} style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>第 {page} 页</div>
          {blocks.map((block, idx) => (
            <div
              key={idx}
              style={{
                border: '1px solid #3498db',
                borderRadius: 6,
                background: '#fff',
                marginBottom: 8,
                padding: 8,
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(52,152,219,0.08)'
              }}
              onClick={() => onBlockClick?.(block, idx)}
            >
              <div style={{ fontSize: 12, color: '#3498db', marginBottom: 4 }}>{block.language}</div>
              <pre style={{ fontSize: 12, margin: 0, maxHeight: 80, overflow: 'auto' }}>{block.content.slice(0, 200)}</pre>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
