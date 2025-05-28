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
  page: number;
  onOpenCodeEditor: (block: CodeBlock) => void;
}

export const PageBoundCodeBlocks: React.FC<Props> = ({ 
  codeBlocks, 
  page,
  onOpenCodeEditor 
}) => {
  const currentPageBlocks = codeBlocks.filter(block => block.page === page);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {currentPageBlocks.map((block, index) => (
        <div
          key={index}
          className="absolute bg-blue-100 border-2 border-blue-300 opacity-50 hover:opacity-70 cursor-pointer pointer-events-auto"
          style={{
            left: `${block.x * 100}%`,
            top: `${block.y * 100}%`,
            width: `${block.width * 100}%`,
            height: `${block.height * 100}%`,
          }}
          onClick={() => onOpenCodeEditor(block)}
          title={`${block.language} 代码块`}
        />
      ))}
    </div>
  );
}; 