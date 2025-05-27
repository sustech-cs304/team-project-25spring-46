// SidePanelContainer.tsx
import React from 'react';
import { useSidePanel } from './SidePanelContext';
import { getVsCodeApi } from '../vscodeApi';

async function deleteComment(id: string): Promise<boolean> {
  // TODO:
  const vscode = getVsCodeApi();
  console.log('请求删除评论, comment ID =', id);
  vscode.postMessage({
    command: 'deleteComments',
    id,
  });

  return new Promise((resolve, reject) => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'deleteCommentsSuccess' && message.id === id) {
        console.log('删除评论成功 - id:', message.id);
        window.removeEventListener('message', handleMessage);
        resolve(true);
      } else if (message.command === 'deleteCommentsError' && message.id === id) {
        console.error('删除评论失败', message.error);
        window.removeEventListener('message', handleMessage);
        reject(new Error(message.error));
      }
    };
  
    window.addEventListener('message', handleMessage);
  });
}

// 评论详情子组件
const CommentDetailPanel: React.FC<{ 
  data: { content: string; author: string; time: string ;}; 
  onClose: () => void;
  onDelete: () => void;
}> = ({ data, onClose, onDelete }) => {
  const handleDelete = () => {
    // const confirmed = window.confirm('确定要删除这条评论吗？');
    // if (confirmed) {
    //   onDelete();
    // }
    onDelete();
  };

  return (
    <div className="border border-gray-300 bg-white shadow-lg rounded-xl overflow-hidden mb-4">
      <div className="flex justify-between items-center bg-blue-500 text-white p-2">
        <button className="hover:text-gray-200" onClick={handleDelete}>删除 🗑 </button>
        <div className="text-sm font-semibold">{data.author}</div>
        <div className="text-xs">{data.time}</div>
        <button 
          className="text-white hover:text-gray-200 text-xs" 
          onClick={() => {
            console.log('点击了关闭按钮');
            onClose();
          }}>
          ✕
        </button>
      </div>
      <div className="p-4 text-sm text-gray-700 whitespace-pre-wrap">
        {data.content}
      </div>
    </div>
  );
};

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
    <div className="p-4 overflow-auto h-full bg-gray-50 z-20 relative">
      {openPanels.map(panel => {
        if (panel.type === 'comment') {
          return (
            <CommentDetailPanel
              key={panel.id}
              data={{ content: panel.content, author: panel.author, time: panel.time }}
              onClose={() => closePanel(panel.id)}
              onDelete={async () => {
                try {
                  const success = await deleteComment(panel.id);
                  if (success) {
                    closePanel(panel.id); // 删除成功后关闭面板
                  }
                } catch (err) {
                  console.error('删除失败:', err);
                }
              }}
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
