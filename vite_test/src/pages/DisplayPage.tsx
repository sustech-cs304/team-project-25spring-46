// src/pages/DisplayPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
import { usePDFMetrics } from './PDFViewer';

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
  
  const [tempPosition, setTempPosition] = useState<CommentPosition | null>(null);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const pageMetrics = usePDFMetrics();

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
    console.log('handleAddComment: 添加评论, comment =', comment);

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
      data: {
        filePath,
        comment: commentInput
      }
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
      setTempPosition(null);                 // ✅ 清空临时位置
      setShowCommentDialog(false);          // ✅ 关闭弹窗
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
      setTempPosition(null);                 // ✅ 清空临时位置
      setShowCommentDialog(false);          // ✅ 关闭弹窗
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
      setTempPosition(null);                 // ✅ 清空临时位置
      setShowCommentDialog(false);          // ✅ 关闭弹窗
    }
  };

  const handlePDFClick = useCallback((e: React.MouseEvent) => {
    if (commentMode === 'none') return;

    console.log('handlePDFClick: 点击事件');

    const toolbar = document.querySelector('.comment-toolbar');
    if (toolbar && toolbar.contains(e.target as Node)) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const pageIndex = pageMetrics.findIndex(metric => 
      e.clientY >= metric.offsetY && e.clientY <= metric.offsetY + metric.height
    );

    console.log('handlePDFClick: 点击事件, pageIndex =', pageIndex);

    if (pageIndex === -1) return;

    const basePosition: CommentPosition = {
      type: commentMode,
      x1: x,
      y1: y,
      page: pageIndex + 1
    };

    console.log('handlePDFClick: 点击事件, 设置临时位置: (', basePosition.x1, basePosition.y1, ')');

    if (commentMode === 'text') {
      setTempPosition(basePosition);
      setShowCommentDialog(true); // ✅ 显示弹窗
      console.log('handlePDFClick: text, 点击事件, 显示评论输入框');
    } else if (commentMode === 'highlight') {
      setTempPosition({
        ...basePosition,
        width: 0,
        height: 0
      });
      console.log('handlePDFClick: highlight, 点击事件, 设置临时位置');
    } else if (commentMode === 'underline') {
      setTempPosition({
        ...basePosition,
        x2: x,
        y2: y
      });
      console.log('handlePDFClick: underline, 点击事件, 设置临时位置');
    }
  }, [commentMode, pageMetrics]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (commentMode === 'none' || !tempPosition) return;

    console.log('handleMouseUp: 鼠标释放事件');

    const toolbar = document.querySelector('.comment-toolbar');
    if (toolbar && toolbar.contains(e.target as Node)) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    console.log('handleMouseUp: 鼠标释放事件, 位置: (', x, y, ')');

    if (commentMode === 'highlight') {
      setTempPosition({
        ...tempPosition,
        x1: Math.min(tempPosition.x1, x),
        y1: Math.min(tempPosition.y1, y),
        width: Math.abs(x - tempPosition.x1),
        height: Math.abs(y - tempPosition.y1)
      });
      console.log('handleMouseUp: highlight, 鼠标释放事件, 最终位置: (', tempPosition.x1, tempPosition.y1, tempPosition.width, tempPosition.height, ')');
      setShowCommentDialog(true); // ✅ 显示弹窗
      console.log('handleMouseUp: highlight, 鼠标释放事件, 显示评论对话框');
    } else if (commentMode === 'underline') {
      setTempPosition({
        ...tempPosition,
        x2: x,
        y2: y
      });
      console.log('handleMouseUp: underline, 鼠标释放事件, 最终位置: (', tempPosition.x1, tempPosition.y1, tempPosition.x2, tempPosition.y2, ')');
      setShowCommentDialog(true); // ✅ 显示弹窗
      console.log('handleMouseUp: underline, 鼠标释放事件, 显示评论对话框');
    }
  }, [commentMode, tempPosition]);

  // 判断侧边栏
  const hasCode = openPanels.some(p => p.type === 'code');
  const left = hasCode ? 60 : 70;
  const right = 100 - left;

  const renderContent = () => (
    <>
      <CommentOverlay 
        data={comments} 
        onPDFClick={handlePDFClick}
        onMouseUp={handleMouseUp}
      />
      <CodeAnnotation data={dummyCodeBlocks} />
      <CommentToolbar
        currentMode={commentMode}
        onModeChange={setCommentMode}
        onAddComment={handleAddComment}
        showDialog={showCommentDialog}                // ✅ 传入是否显示
        pendingPosition={tempPosition}                   // ✅ 传入临时位置信息
        onCancelDialog={() => setShowCommentDialog(false)}  // ✅ 控制弹窗关闭
      />
    </>
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
      <PDFViewer filePath={filePath}>
        <PageLayout filePath={filePath} />
      </PDFViewer>
    </SidePanelProvider>
  );
};

export default DisplayPage;
