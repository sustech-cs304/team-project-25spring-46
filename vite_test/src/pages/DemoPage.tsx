/*
 * @Author: hatfail 1833943280@qq.com
 * @Date: 2025-05-19 16:27:25
 * @LastEditors: hatfail 1833943280@qq.com
 * @LastEditTime: 2025-05-27 22:36:23
 * @FilePath: \team-project-25spring-46\vite_test\src\pages\DemoPage.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// src/pages/DemoPage.tsx
import React, { useState, useEffect } from 'react';
import { SidePanelProvider, useSidePanel } from './SidePanelContext';
import PDFViewer from './PDFViewer';
import CommentOverlay from './CommentOverlay';
import CodeAnnotation from './CodeAnnotation';
import SidePanelContainer from './SidePanelContainer';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { CommentData, CodeSnippetData } from '../types/annotations';
// import { getVsCodeApi } from '../vscodeApi';
// import { getAllComments } from '../../../src/commentService';


// const dummyComments: CommentData[] = [
//   { id: 'c1', page: 1, type: 'text', content: '第一页顶部评论。', author: '张三', time: '2025-05-06', position: { x: 0.5, y: 0.5 } },
//   { id: 'c2', page: 1, type: 'highlight', content: '注意此段内容。', author: '李四', time: '2025-05-06', position: { x: 0.2, y: 0.3 } }
// ];

const dummyCodeBlocks: CodeSnippetData[] = [
  { id: 'code1', page: 2, content: 'console.log("Hello World");', position: { x: 0.5, y: 0.5, width: 0.6, height: 0.1 }, language: "Unknown" }
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
        <CommentOverlay data={dummyComments}/>
        <CodeAnnotation data={dummyCodeBlocks} />
      </PDFViewer>
    );
  }

  return (
    <PanelGroup direction="horizontal">
      <Panel defaultSize={leftSize}>
        <PDFViewer filePath='demo.pdf'>
          <CommentOverlay data={dummyComments}/>
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
