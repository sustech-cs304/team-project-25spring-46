// src/pages/DemoPage.tsx
import React, { useState, useEffect } from 'react';
import { SidePanelProvider, useSidePanel } from './SidePanelContext';
import PDFViewer from './PDFViewer';
import CommentOverlay from './CommentOverlay';
import CodeAnnotation from './CodeAnnotation';
import SidePanelContainer from './SidePanelContainer';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { CommentData, CodeSnippetData } from '../types/annotations';
import type { PageMetrics } from './PDFViewer';
// import { getVsCodeApi } from '../vscodeApi';
// import { getAllComments } from '../../../src/commentService';


// const dummyComments: CommentData[] = [
//   { id: 'c1', page: 1, type: 'text', content: '第一页顶部评论。', author: '张三', time: '2025-05-06', position: { x: 0.5, y: 0.5 } },
//   { id: 'c2', page: 1, type: 'highlight', content: '注意此段内容。', author: '李四', time: '2025-05-06', position: { x: 0.2, y: 0.3 } }
// ];

const dummyCodeBlocks: CodeSnippetData[] = [
  { id: 'code1', page: 2, content: 'console.log("Hello World");', position: { x: 0.5, y: 0.5, width: 0.6, height: 0.1 } }
];

// 创建一些测试用的评论数据
// const dummyComments: CommentData[] = [
//   {
//     id: '1',
//     page: 1,
//     type: 'text',
//     content: '这是一个测试评论',
//     position: { x: 0.1, y: 0.1 },
//     author: 'test_user',
//     time: new Date().toISOString(),
//   },
//   {
//     id: '2',
//     page: 1,
//     type: 'highlight',
//     content: '这是一个高亮评论',
//     position: { x: 0.2, y: 0.2, width: 0.1, height: 0.1 },
//     author: 'test_user',
//     time: new Date().toISOString(),
//   },
//   {
//     id: '3',
//     page: 1,
//     type: 'underline',
//     content: '这是一个下划线评论',
//     position: { x1: 0.3, y1: 0.3, x2: 0.4, y2: 0.3 },
//     author: 'test_user',
//     time: new Date().toISOString(),
//   },
// ];

// 创建一些测试用的页面度量数据
const dummyPageMetrics: PageMetrics[] = [
  {
    width: 595,
    height: 842,
    offsetY: 0,
    offsetX: 0,
  },
];

const PageLayout: React.FC = () => {
  const { openPanels } = useSidePanel();
  const [dummyComments, ] = useState<CommentData[]>([]);

  useEffect(() => {
    async function fetchComments() {
      try {
        console.log('跳过demo的获取评论');
        // const result = await getAllComments('/Users/alice/test.pdf');
        // setComments(result);
      } catch (err) {
        console.error('加载评论失败:', err);
      }
    }
    fetchComments();
  }, []);

  const hasCodePanel = openPanels.some(p => p.type === 'code');
  const leftSize = hasCodePanel ? 60 : 70;
  const rightSize = 100 - leftSize;

  // const [PdfWorkerPath, setPdfWorkerPath] = useState('');


  if (openPanels.length === 0) {
    return (
      <PDFViewer filePath='demo.pdf'>
        <CommentOverlay data={dummyComments} pageMetrics={dummyPageMetrics}/>
        <CodeAnnotation data={dummyCodeBlocks} />
      </PDFViewer>
    );
  }

  return (
    <PanelGroup direction="horizontal">
      <Panel defaultSize={leftSize}>
        <PDFViewer filePath='demo.pdf'>
          <CommentOverlay data={dummyComments} pageMetrics={dummyPageMetrics}/>
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
