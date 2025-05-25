// src/pages/DisplayPage.tsx
import React, { useState, useEffect } from 'react';
import { SidePanelProvider, useSidePanel } from './SidePanelContext';
import PDFViewer from './PDFViewer';
import CommentOverlay from './CommentOverlay';
import CodeAnnotation from './CodeAnnotation';
import SidePanelContainer from './SidePanelContainer';
import CommentToolbar, { CommentMode } from './CommentToolbar';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { CommentData, CodeSnippetData } from '../types/annotations';
import { getVsCodeApi } from '../vscodeApi';
import { RawCommentInput } from '../../../src/commentService';

interface DisplayPageProps {
  filePath: string;
}

interface CommentPosition {
  type: CommentMode;
  x1: number;
  y1: number;
  x2?: number;
  y2?: number;
  width?: number;
  height?: number;
  page: number;
}

interface NewComment {
  type: CommentMode;
  position: CommentPosition;
  content: string;
}

const PageLayout: React.FC<{ filePath: string }> = ({ filePath }) => {
  console.log('PageLayout: 已进入, filePath =', filePath);
  const { openPanels } = useSidePanel();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentMode, setCommentMode] = useState<CommentMode>('none');
  const dummyCodeBlocks: CodeSnippetData[] = [
    { id: 'code1', page: 2, content: 'console.log("Hello World");', position: { x: 0.5, y: 0.5, width: 0.6, height: 0.1 } }
  ];

  // 获取评论
  useEffect(() => {
    console.log('PageLayout: 请求获取评论, filePath =', filePath);
    const vscode = getVsCodeApi();
    vscode.postMessage({
      command: 'getAllComments',
      filePath,
    });
  }, [filePath]);
 
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'getAllCommentsSuccess') {
        console.log('PageLayout: 成功获取评论', message.comments);
        setComments(message.comments);
      } else if (message.command === 'getAllCommentsError') {
        console.error('PageLayout: 获取评论失败', message.error);
      }
    };
  
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleAddComment = (comment: NewComment) => {
    const vscode = getVsCodeApi();
    const { type, position, content } = comment;

    const commentInput: RawCommentInput = {
      filePath,
      page: position.page,
      type: type === 'none' ? undefined : type,
      content,
      author: '当前用户',
      x1: position.x1,
      y1: position.y1,
      x2: position.x2,
      y2: position.y2,
      width: position.width,
      height: position.height
    };

    vscode.postMessage({
      command: 'addComment',
      filePath,
      comment: commentInput
    });

    if(type === 'text'){
      const newComment: CommentData = {
        id: Date.now().toString(),
        page: position.page,
        type: 'text',
        content,
        position: {
          x: position.x1,
          y: position.y1,
          ...(position.width && { width: position.width }),
          ...(position.height && { height: position.height }),
          ...(position.x2 && { x2: position.x2 }),
          ...(position.y2 && { y2: position.y2 })
        },
        author: '当前用户',
        time: new Date().toISOString(),
      };
      setComments(prev => [...prev, newComment]);
    }else if(type === 'highlight'){
      const newComment: CommentData = {
        id: Date.now().toString(),
        page: position.page,
        type: 'highlight',
        content,
        position: {
          x: position.x1,
          y: position.y1,
          width: position.width!,
          height: position.height!
        },
        author: '当前用户',
        time: new Date().toISOString(),
      };
      setComments(prev => [...prev, newComment]);
    }else if(type === 'underline'){
      const newComment: CommentData = {
        id: Date.now().toString(),
        page: position.page,
        type: 'underline',
        content,
        position: {
          x1: position.x1,
          y1: position.y1,
          x2: position.x2!,
          y2: position.y2!
        },
        author: '当前用户',
        time: new Date().toISOString(),
      };
      setComments(prev => [...prev, newComment]);
    }
  };

  // 判断侧边栏
  const hasCode = openPanels.some(p => p.type === 'code');
  const left = hasCode ? 60 : 70;
  const right = 100 - left;

  const renderContent = () => (
    <PDFViewer filePath={filePath}>
      <CommentOverlay 
        data={comments} 
        onPDFClick={commentMode !== 'none' ? (e) => {
          const toolbar = document.querySelector('.comment-toolbar');
          if (toolbar && toolbar.contains(e.target as Node)) return;
          // 处理点击事件
        } : undefined}
        onMouseUp={commentMode !== 'none' ? (e) => {
          const toolbar = document.querySelector('.comment-toolbar');
          if (toolbar && toolbar.contains(e.target as Node)) return;
          // 处理鼠标释放事件
        } : undefined}
      />
      <CodeAnnotation data={dummyCodeBlocks} />
      <CommentToolbar
        currentMode={commentMode}
        onModeChange={setCommentMode}
        onAddComment={handleAddComment}
      />
    </PDFViewer>
  );

  if (openPanels.length === 0) {
    return renderContent();
  }

  return (
    <PanelGroup direction="horizontal">
      <Panel defaultSize={left}>
        {renderContent()}
      </Panel>
      <PanelResizeHandle className="resize-handle" />
      <Panel defaultSize={right}>
        <SidePanelContainer />
      </Panel>
    </PanelGroup>
  );
};

const DisplayPage: React.FC<DisplayPageProps> = ({ filePath }) => {
  console.log('已进入 DisplayPage, filePath =', filePath);

  return (
    <SidePanelProvider>
      <PageLayout filePath={filePath} />
    </SidePanelProvider>
  );
};

export default DisplayPage;
