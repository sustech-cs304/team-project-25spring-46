// src/pages/DisplayPage.tsx
import React, { useState, useEffect } from 'react';
import { SidePanelProvider, useSidePanel } from './SidePanelContext';
import PDFViewer from './PDFViewer';
import CommentOverlay from './CommentOverlay';
import CodeAnnotation from './CodeAnnotation';
import SidePanelContainer from './SidePanelContainer';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { CommentData, CodeSnippetData } from '../types/annotations';
import { getAllComments } from '../../../src/commentService';

interface DisplayPageProps {
  filePath: string;
}

const PageLayout: React.FC<{ filePath: string }> = ({ filePath }) => {
  const { openPanels } = useSidePanel();
  const [comments, setComments] = useState<CommentData[]>([]);
  const dummyCodeBlocks: CodeSnippetData[] = [
    { id: 'code1', page: 2, content: 'console.log("Hello World");', position: { x: 0.5, y: 0.5, width: 0.6, height: 0.1 } }
  ];

  useEffect(() => {
    getAllComments(filePath)
      .then(setComments)
      .catch(err => console.error('加载评论失败:', err));
  }, [filePath]);

  // 判断侧边栏
  const hasCode = openPanels.some(p => p.type === 'code');
  const left = hasCode ? 60 : 70;
  const right = 100 - left;

  if (openPanels.length === 0) {
    return (
      <PDFViewer filePath={filePath}>
        <CommentOverlay data={comments} />
        <CodeAnnotation data={dummyCodeBlocks} />
      </PDFViewer>
    );
  }

  return (
    <PanelGroup direction="horizontal">
      <Panel defaultSize={left}>
        <PDFViewer filePath={filePath}>
          <CommentOverlay data={comments} />
          <CodeAnnotation data={dummyCodeBlocks} />
        </PDFViewer>
      </Panel>
      <PanelResizeHandle className="resize-handle" />
      <Panel defaultSize={right}>
        <SidePanelContainer />
      </Panel>
    </PanelGroup>
  );
};

const DisplayPage: React.FC<DisplayPageProps> = ({ filePath }) => (
  <SidePanelProvider>
    <PageLayout filePath={filePath} />
  </SidePanelProvider>
);

export default DisplayPage;
