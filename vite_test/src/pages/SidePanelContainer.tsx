// SidePanelContainer.tsx
import React from 'react';
import { useSidePanel } from './SidePanelContext';

// 评论详情子组件
const CommentDetailPanel: React.FC<{ data: { content: string; author: string; time: string }; onClose: () => void }> = ({ data, onClose }) => (
  <div className="border border-gray-300 bg-white shadow-lg rounded-xl overflow-hidden mb-4">
    <div className="flex justify-between items-center bg-blue-500 text-white p-2">
      <div className="text-sm font-semibold">{data.author}</div>
      <div className="text-xs">{data.time}</div>
      <button className="text-white hover:text-gray-200 text-xs" onClick={onClose}>
        ✕
      </button>
    </div>
    <div className="p-4 text-sm text-gray-700 whitespace-pre-wrap">
      {data.content}
    </div>
  </div>
);

// 代码详情子组件
const CodeDetailPanel: React.FC<{ data: { code: string; language?: string }; onClose: () => void }> = ({ data, onClose }) => {
  const [codeText, setCodeText] = React.useState(data.code);

  const copyCode = () => {
    navigator.clipboard.writeText(codeText);
  };

  const saveCode = () => {
    console.log("保存代码:", codeText);
  };

  return (
    <div className="border border-gray-300 bg-white shadow-lg rounded-xl overflow-hidden mb-4">
      <div className="flex justify-between items-center bg-green-500 text-white p-2">
        <div className="text-sm font-semibold">代码片段 {data.language && `(${data.language})`}</div>
        <div className="space-x-2 text-xs">
          <button className="hover:text-gray-200" onClick={copyCode}>复制</button>
          <button className="hover:text-gray-200" onClick={saveCode}>保存</button>
          <button className="hover:text-gray-200" onClick={onClose}>✕</button>
        </div>
      </div>
      <textarea
        className="w-full h-40 p-3 font-mono text-sm bg-gray-50 border-t border-b border-gray-200 resize-y outline-none"
        value={codeText}
        onChange={e => setCodeText(e.target.value)}
      />
      <div className="p-3 bg-gray-100 text-sm">
        <strong>运行结果:</strong>
        <div className="mt-2 text-gray-600">(结果输出区域)</div>
      </div>
    </div>
  );
};

// 侧边详情面板容器
const SidePanelContainer: React.FC = () => {
  const { openPanels, closePanel } = useSidePanel();

  if (openPanels.length === 0) {
    return null;
  }

  return (
    <div className="p-4 overflow-auto h-full bg-gray-50">
      {openPanels.map(panel => {
        if (panel.type === 'comment') {
          return (
            <CommentDetailPanel
              key={panel.id}
              data={{ content: panel.content, author: panel.author, time: panel.time }}
              onClose={() => closePanel(panel.id)}
            />
          );
        } else if (panel.type === 'code') {
          return (
            <CodeDetailPanel
              key={panel.id}
              data={{ code: panel.code, language: panel.language }}
              onClose={() => closePanel(panel.id)}
            />
          );
        }
        return null;
      })}
    </div>
  );
};

export default SidePanelContainer;
