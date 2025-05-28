import React, { useState } from 'react';
import { usePDFMetrics } from '../PDFViewer';
import MonacoEditor from 'react-monaco-editor';

interface CodeBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  language: string;
  content: string;
  page: number;
}

interface Props {
  codeBlocks: CodeBlock[];
}

export const CodeBlockOverlay: React.FC<Props> = ({ codeBlocks }) => {
  const pageMetrics = usePDFMetrics();
  console.log('pageMetrics', pageMetrics);
  const [hovered, setHovered] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <>
      <pre style={{zIndex: 9999, position: 'fixed', top: 0, left: 0, background: '#fff'}}>{JSON.stringify(codeBlocks, null, 2)}</pre>
      {codeBlocks.map((block, idx) => {
        const metric = pageMetrics[block.page - 1];
        if (!metric) return null;
        const left = block.x * metric.width;
        const top = metric.offsetY + block.y * metric.height;
        const width = block.width * metric.width;
        const height = block.height * metric.height;

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left, top, width, height,
              border: hovered === idx ? '2px solid #f39c12' : '2px solid #3498db',
              background: hovered === idx ? 'rgba(255, 230, 180, 0.2)' : 'rgba(52, 152, 219, 0.08)',
              cursor: 'pointer',
              zIndex: 10,
            }}
            onMouseEnter={() => setHovered(idx)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => setEditing(idx)}
            title={block.language}
          >
            <span style={{
              position: 'absolute', top: 0, left: 0, background: '#3498db', color: '#fff', fontSize: 10, padding: '0 4px', borderRadius: 2
            }}>{block.language}</span>
          </div>
        );
      })}

      {/* 悬停预览 */}
      {hovered !== null && codeBlocks[hovered] && (() => {
        const block = codeBlocks[hovered];
        const metric = pageMetrics[block.page - 1];
        const left = block.x * metric.width + 10;
        const top = metric.offsetY + block.y * metric.height + 10;
        return (
          <div
            style={{
              position: 'absolute',
              left, top,
              zIndex: 100,
              background: '#fff',
              border: '1px solid #ccc',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              padding: 8,
              maxWidth: 400,
              maxHeight: 300,
              overflow: 'auto'
            }}
          >
            <pre style={{ fontSize: 12, margin: 0 }}>{block.content}</pre>
          </div>
        );
      })()}

      {/* 编辑器弹窗 */}
      {editing !== null && codeBlocks[editing] && (
        <div style={{
          position: 'fixed', top: 60, right: 60, zIndex: 2000,
          background: '#fff', border: '1px solid #ccc', borderRadius: 8, boxShadow: '0 2px 16px rgba(0,0,0,0.2)'
        }}>
          <div style={{ padding: 8, borderBottom: '1px solid #eee', fontWeight: 'bold' }}>
            代码编辑器（{codeBlocks[editing].language}）
            <button onClick={() => setEditing(null)} style={{ float: 'right' }}>关闭</button>
          </div>
          <MonacoEditor
            height="400px"
            language={codeBlocks[editing].language.toLowerCase()}
            value={codeBlocks[editing].content}
            options={{
              readOnly: false,
              minimap: { enabled: false },
              lineNumbers: 'on',
            }}
          />
        </div>
      )}
    </>
  );
};
