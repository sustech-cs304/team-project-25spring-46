import React from 'react';
import { CodeSnippetData } from '../../types/annotations';
import { usePDFMetrics } from '../PDFViewer';

interface Props {
  data: CodeSnippetData[];
}

const CodeAnnotation: React.FC<Props> = ({ data }) => {
  const pageMetrics = usePDFMetrics();

  return (
    <div className="absolute inset-0">
      {data.map(codeBlock => {
        const metric = pageMetrics[codeBlock.page - 1];
        if (!metric) return null;

        const { position } = codeBlock;
        const left = metric.offsetX + position.x * metric.width;
        const top = metric.offsetY + position.y * metric.height;
        const width = position.width * metric.width;
        const height = position.height * metric.height;

        return (
          <div
            key={codeBlock.id}
            className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-20 cursor-pointer hover:bg-opacity-30"
            style={{
              left,
              top,
              width,
              height,
            }}
            title={`${codeBlock.language} 代码块`}
          >
            <div className="absolute top-0 left-0 bg-blue-500 text-white text-xs px-1 rounded-br">
              {codeBlock.language}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CodeAnnotation; 