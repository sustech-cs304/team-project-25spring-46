import React from 'react';
import type { CodeBlock } from './filePageComponents/CodeRecognition';
import { getVsCodeApi } from '../vscodeApi';

interface CurrentPageCodeDisplayProps {
  codeBlocks: CodeBlock[];
}

export const CurrentPageCodeDisplay: React.FC<CurrentPageCodeDisplayProps> = ({ codeBlocks }) => {
  const vscode = getVsCodeApi();

  if (codeBlocks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 bg-gray-50 p-4">
        当前页面没有检测到代码块
      </div>
    );
  }

  // 运行代码
  const handleRunCode = (block: CodeBlock) => {
    if (vscode) {
      vscode.postMessage({
        command: 'runCode',
        code: block.content,
        language: block.language
      });
    }
  };

  // 在编辑器中打开
  const handleOpenInEditor = (block: CodeBlock, index: number) => {
    if (vscode) {
      vscode.postMessage({
        command: 'openCodeInEditor',
        code: block.content,
        language: block.language,
        blockIdx: index
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-2 border-b bg-white">
        <h2 className="text-base font-bold">当前页面代码 ({codeBlocks.length})</h2>
      </div>
      
      <div className="overflow-auto flex-grow p-2">
        <div className="space-y-3">
          {codeBlocks.map((block, index) => (
            <div key={index} className="bg-white shadow rounded overflow-hidden border">
              <div className="flex justify-between items-center bg-gray-100 px-2 py-1">
                <div className="flex items-center">
                  <span className="font-medium text-xs bg-blue-50 border border-blue-200 px-1 py-0.5 rounded text-blue-700">
                    {block.language}
                  </span>
                </div>
                <div className="flex space-x-1 text-xs">
                  <button
                    onClick={() => handleRunCode(block)}
                    className="bg-green-500 text-white px-1.5 py-0.5 rounded hover:bg-green-600"
                    title="运行代码"
                  >
                    运行
                  </button>
                  <button
                    onClick={() => handleOpenInEditor(block, index)}
                    className="bg-blue-500 text-white px-1.5 py-0.5 rounded hover:bg-blue-600"
                    title="在编辑器中打开"
                  >
                    编辑
                  </button>
                </div>
              </div>
              <div className="overflow-auto bg-gray-50" style={{ maxHeight: '150px' }}>
                <pre className="p-2 text-xs whitespace-pre-wrap break-all">
                  <code>{block.content}</code>
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};