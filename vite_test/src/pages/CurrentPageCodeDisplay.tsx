import React from 'react';

interface CodeBlock {
  language: string;
  content: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  codeBlocks: CodeBlock[];
}

export const CurrentPageCodeDisplay: React.FC<Props> = ({ codeBlocks }) => {
  return (
    <div className="h-full bg-gray-50 p-4 overflow-auto">
      <h3 className="text-lg font-semibold mb-4">当前页面代码</h3>
      {codeBlocks.length === 0 ? (
        <p className="text-gray-500">当前页面没有代码块</p>
      ) : (
        <div className="space-y-4">
          {codeBlocks.map((block, index) => (
            <div key={index} className="bg-white p-4 rounded shadow">
              <div className="text-sm text-gray-500 mb-2">{block.language}</div>
              <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                <code>{block.content}</code>
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 