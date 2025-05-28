import React, { useState, useEffect } from 'react';
import { SidePanelProvider, useSidePanel } from './SidePanelContext';
import PDFViewer from './PDFViewer';
import CommentOverlay from './CommentOverlay';
import CodeAnnotation from './CodeAnnotation';
import SidePanelContainer from './SidePanelContainer';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { CommentData, CodeSnippetData } from '../types/annotations';
import { getAllComments } from '../../../src/commentService';
import { CodeBlockOverlay } from './filePageComponents/CodeBlockOverlay';
import type { CodeBlock } from './filePageComponents/CodeRecognition'
import { CodeBlockSidebar } from './filePageComponents/CodeBlockSidebar';
import { getVsCodeApi } from '../vscodeApi'; // 修正1

interface DisplayPageProps {
  filePath: string;
}

const PageLayout: React.FC<{ filePath: string }> = ({ filePath }) => {
  const { openPanels } = useSidePanel();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [codeBlocksRaw] = useState<CodeSnippetData[]>([]);
  const [codeBlocks, setCodeBlocks] = useState<CodeBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<CodeBlock | null>(null);

  useEffect(() => {
    getAllComments(filePath)
      .then(setComments)
      .catch(err => console.error('加载评论失败:', err));
  }, [filePath]);

  useEffect(() => {
    // 监听 pdfCodeBlocks 消息
    const handler = (event: MessageEvent) => { // 修正2
      const { command, data } = event.data;
      if (command === 'pdfCodeBlocks') {
        const rawBlocks = JSON.parse(data);
        // 只取 language/content/page 字段
        const parsedBlocks = rawBlocks.map((block: CodeBlock) => ({
          language: block.language,
          content: block.content,
          page: block.page,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
        }));
        setCodeBlocks(parsedBlocks);
      }
    };
    window.addEventListener('message', handler);
    // 发送请求
    const vscode = getVsCodeApi(); // 修正1
    vscode?.postMessage({ command: 'openFile', filePath });
    return () => window.removeEventListener('message', handler);
  }, [filePath]);

  // 判断侧边栏
  const hasCode = openPanels.some(p => p.type === 'code');
  const left = hasCode ? 60 : 70;
  const right = 100 - left;

  if (openPanels.length === 0) {
    return (
      <div style={{ display: 'flex', height: '100vh' }}>
        <CodeBlockSidebar
          codeBlocks={codeBlocks}
          onBlockClick={(block: CodeBlock) => setSelectedBlock(block)} // 修正3
        />
        <div style={{ flex: 1, position: 'relative' }}>
          <PDFViewer filePath={filePath}>
            <CommentOverlay data={comments} />
            <CodeAnnotation data={codeBlocksRaw} />
            <CodeBlockOverlay codeBlocks={codeBlocks} />
          </PDFViewer>
          {selectedBlock && (
            <div style={{
              position: 'fixed', top: 60, right: 60, zIndex: 2000,
              background: '#fff', border: '1px solid #ccc', borderRadius: 8, boxShadow: '0 2px 16px rgba(0,0,0,0.2)'
            }}>
              <div style={{ padding: 8, borderBottom: '1px solid #eee', fontWeight: 'bold' }}>
                代码编辑器（{selectedBlock.language}）
                <button onClick={() => setSelectedBlock(null)} style={{ float: 'right' }}>关闭</button>
              </div>
              <pre style={{ margin: 0, padding: 16 }}>{selectedBlock.content}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <PanelGroup direction="horizontal">
      <Panel defaultSize={left}>
        <div style={{ display: 'flex', height: '100vh' }}>
          <CodeBlockSidebar
            codeBlocks={codeBlocks}
            onBlockClick={(block: CodeBlock) => setSelectedBlock(block)} // 修正3
          />
          <div style={{ flex: 1, position: 'relative' }}>
            <PDFViewer filePath={filePath}>
              <CommentOverlay data={comments} />
              <CodeAnnotation data={codeBlocksRaw} />
              <CodeBlockOverlay codeBlocks={codeBlocks} />
            </PDFViewer>
            {selectedBlock && (
              <div style={{
                position: 'fixed', top: 60, right: 60, zIndex: 2000,
                background: '#fff', border: '1px solid #ccc', borderRadius: 8, boxShadow: '0 2px 16px rgba(0,0,0,0.2)'
              }}>
                <div style={{ padding: 8, borderBottom: '1px solid #eee', fontWeight: 'bold' }}>
                  代码编辑器（{selectedBlock.language}）
                  <button onClick={() => setSelectedBlock(null)} style={{ float: 'right' }}>关闭</button>
                </div>
                <pre style={{ margin: 0, padding: 16 }}>{selectedBlock.content}</pre>
              </div>
            )}
          </div>
        </div>
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
