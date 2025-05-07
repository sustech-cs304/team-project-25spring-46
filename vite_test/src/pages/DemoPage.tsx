// src/pages/DemoPage.tsx
import React from 'react';
import { SidePanelProvider, useSidePanel } from './SidePanelContext';
import PDFViewer from './PDFViewer';
import CommentOverlay from './CommentOverlay';
import CodeAnnotation from './CodeAnnotation';
import SidePanelContainer from './SidePanelContainer';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { CommentData, CodeSnippetData } from '../types/annotations';

const samplePdfPath = '/assets/sample.pdf';

const dummyComments: CommentData[] = [
  { id: 'c1', page: 1, type: 'text', content: '第一页顶部评论。', author: '张三', time: '2025-05-06', position: { x: 0.5, y: 0.5 } },
  { id: 'c2', page: 1, type: 'highlight', content: '注意此段内容。', author: '李四', time: '2025-05-06', position: { x: 0.2, y: 0.3 } }
];

const dummyCodeBlocks: CodeSnippetData[] = [
  { id: 'code1', page: 2, content: 'console.log("Hello World");', position: { x: 0.5, y: 0.5, width: 0.6, height: 0.1 } }
];

const PageLayout: React.FC = () => {
  const { openPanels } = useSidePanel();
  const hasCodePanel = openPanels.some(p => p.type === 'code');
  const leftSize = hasCodePanel ? 60 : 70;
  const rightSize = 100 - leftSize;

  if (openPanels.length === 0) {
    return (
      <PDFViewer pdfUrl={samplePdfPath}>
        <CommentOverlay data={dummyComments} />
        <CodeAnnotation data={dummyCodeBlocks} />
      </PDFViewer>
    );
  }

  return (
    <PanelGroup direction="horizontal">
      <Panel defaultSize={leftSize}>
        <PDFViewer pdfUrl={samplePdfPath}>
          <CommentOverlay data={dummyComments} />
          <CodeAnnotation data={dummyCodeBlocks} />
        </PDFViewer>
      </Panel>
      <PanelResizeHandle className="resize-handle" />
      <Panel defaultSize={rightSize}>
        <SidePanelContainer />
      </Panel>
    </PanelGroup>
  );
};

const DemoPage: React.FC = () => (
  <SidePanelProvider>
    <PageLayout />
  </SidePanelProvider>
);

export default DemoPage;
