// src/pages/DisplayPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { SidePanelProvider, } from './SidePanelContext';
import PDFViewer from './PDFViewer';
import CommentOverlay from './CommentOverlay';
import SidePanelContainer from './SidePanelContainer';
import CommentToolbar, { CommentMode } from './CommentToolbar';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { CommentData, RawCommentInput } from '../types/annotations';
import { getVsCodeApi } from '../vscodeApi';
import type { PageMetrics } from './PDFViewer';
import { CurrentPageCodeDisplay } from './CurrentPageCodeDisplay';
import { PageBoundCodeBlocks } from './PageBoundCodeBlocks';

interface DisplayPageProps {
  filePath: string;
  username: string;
}

export interface CommentPosition {
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

interface CodeBlock {
  language: string;
  content: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CodeBlockJson {
  language: string;
  code: string;
  page: number;
  position?: [number, number, number, number];
}

const PageLayout: React.FC<{ 
  filePath: string, 
  username: string,
  pageMetrics: PageMetrics[],
  onMetricsChange: (metrics: PageMetrics[]) => void
}> = ({ filePath, username, pageMetrics, onMetricsChange }) => {
  // const { openPanels } = useSidePanel();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentMode, setCommentMode] = useState<CommentMode>('none');
  const [tempPosition, setTempPosition] = useState<CommentPosition | null>(null);
  const [previewPosition, setPreviewPosition] = useState<CommentPosition | null>(null);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [currentPage,] = useState(1);
  const [allBlocks, setAllBlocks] = useState<CodeBlock[]>([]);
  // const [selectedBlocks, setSelectedBlocks] = useState<CodeBlock[]>([]);
  // const [runResults, setRunResults] = useState<{ [key: number]: string }>({});

  const currentPageBlocks = allBlocks.filter(b => b.page === currentPage);

  // 获取评论
  useEffect(() => {
    const vscode = getVsCodeApi();
  
    const fetchComments = () => {
      // console.log('定时请求获取评论, filePath =', filePath);
      vscode.postMessage({
        command: 'getAllComments',
        filePath,
      });
    };
  
    fetchComments(); // 组件加载时立即请求一次
  
    const intervalId = setInterval(fetchComments, 3000); // 每3秒请求一次，可以根据需要调整时间
  
    return () => clearInterval(intervalId); // 组件卸载时清理定时器
  }, [filePath]);
 
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'getAllCommentsSuccess') {
        console.log('PageLayout: 成功获取评论', message.comments);
        setComments(message.comments);
      } else if (message.command === 'getAllCommentsError') {
        console.error('PageLayout: 获取评论失败', message.error);
      } else if (message.command === 'pdfCodeBlocks') {
        const rawBlocks = JSON.parse(message.data);
        setAllBlocks(rawBlocks.map((block: CodeBlockJson) => ({
          language: block.language,
          content: block.code,
          page: block.page,
          x: block.position?.[0] ?? 0,
          y: block.position?.[1] ?? 0,
          width: block.position?.[2] ?? 0,
          height: block.position?.[3] ?? 0,
        })));
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
      author: username,
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
        },
        author: username,
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
        author: username,
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
        author: username,
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

    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top + scrollTop; // 修正Y轴：加入scrollTop

    // 使用 pageMetrics 判断点击的是哪个页面（点击位置是相对于整个容器）
    const pageIndex = pageMetrics.findIndex(metric =>
      clickY >= metric.offsetY && clickY <= metric.offsetY + metric.height
    );

    console.log('handlePDFClick: 点击事件, pageIndex =', pageIndex);
    if (pageIndex === -1) return;

    // 使用相对于该页的坐标（像素 → 百分比）
    const metric = pageMetrics[pageIndex]; // 定义当前页的 metric
    const x = (clickX - metric.offsetX) / metric.width;
    const y = (clickY - metric.offsetY) / metric.height;

    const basePosition: CommentPosition = {
      type: commentMode,
      x1: parseFloat(x.toFixed(6)), // 四舍五入以压缩存储,
      y1: parseFloat(y.toFixed(6)),
      page: pageIndex + 1
    };

    console.log('handlePDFClick: 点击事件, 设置临时位置: (', basePosition.x1, basePosition.y1, ')');

    if (commentMode === 'text') {
      setTempPosition(basePosition);
      setShowCommentDialog(true); // ✅ 显示弹窗
      console.log('handlePDFClick: text, 点击事件, 显示评论输入框');
    } else if (commentMode === 'highlight') {
      if (!tempPosition) {
        setTempPosition(basePosition);
        console.log('handlePDFClick: highlight, 第一次点击事件, 位置: (', basePosition.x1, basePosition.y1, ')');
      } else {
        const newPosition: CommentPosition = {
          type: 'highlight',
          page: tempPosition.page,
          x1: Math.min(tempPosition.x1, x),
          y1: Math.min(tempPosition.y1, y),
          width: Math.abs(x - tempPosition.x1),
          height: Math.abs(y - tempPosition.y1)
        };
        setTempPosition(newPosition);
        console.log('handlePDFClick: highlight, 第二次点击事件, 位置: (', tempPosition.x1, tempPosition.y1, ')');
        setShowCommentDialog(true);
        console.log('handlePDFClick: highlight, 第二次点击事件, 最终位置: (', newPosition.x1, newPosition.y1, newPosition.width, newPosition.height, ')');
      }
    } else if (commentMode === 'underline') {
      if (!tempPosition) {
        setTempPosition(basePosition);
        console.log('handlePDFClick: underline, 第一次点击事件, 位置: (', basePosition.x1, basePosition.y1, ')');
      } else {
        const newPosition: CommentPosition = {
          type: 'underline',
          page: tempPosition.page,
          x1: tempPosition.x1,
          y1: tempPosition.y1,
          x2: x,
          y2: y
        };
        setTempPosition(newPosition);
        console.log('handlePDFClick: underline, 第二次点击事件, 位置: (', tempPosition.x1, tempPosition.y1, ')');
        setShowCommentDialog(true); // ✅ 显示弹窗
        console.log('handlePDFClick: underline, 第二次点击事件, 最终位置: (', newPosition.x1, newPosition.y1, newPosition.x2, newPosition.y2, ')');
      }
    }
  }, [commentMode, tempPosition, pageMetrics]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (commentMode === 'none' || !tempPosition) return;
    if (tempPosition.type === 'text') return;
  
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top + scrollTop;

    const pageIndex = pageMetrics.findIndex(metric =>
      clickY >= metric.offsetY && clickY <= metric.offsetY + metric.height
    );

    // if (pageIndex === -1 || pageIndex + 1 !== tempPosition.page) return;

    const metric = pageMetrics[pageIndex]; // ✅ 当前页的尺寸信息
    const x = (clickX - metric.offsetX) / metric.width;
    const y = (clickY - metric.offsetY) / metric.height;
  
    let newPreview: CommentPosition | null = null;
  
    if (tempPosition.type === 'highlight') {
      newPreview = {
        type: 'highlight',
        page: tempPosition.page,
        x1: Math.min(tempPosition.x1, x),
        y1: Math.min(tempPosition.y1, y),
        width: Math.abs(x - tempPosition.x1),
        height: Math.abs(y - tempPosition.y1),
      };
    } else if (tempPosition.type === 'underline') {
      newPreview = {
        type: 'underline',
        page: tempPosition.page,
        x1: tempPosition.x1,
        y1: tempPosition.y1,
        x2: x,
        y2: y,
      };
    }
    setPreviewPosition(newPreview);
  }, [commentMode, tempPosition, pageMetrics]);

  const handleOpenCodeEditor = useCallback((block: CodeBlock) => {
    const vscode = getVsCodeApi();
    if (vscode) {
      vscode.postMessage({
        command: 'openCodeInEditor',
        code: block.content,
        language: block.language || 'text',
      });
    }
  }, []);

  // 布局分配
  const codeWidth = 15;
  const pdfWidth = 70;
  const rightWidth = 15;

  return (
    <PanelGroup direction="horizontal">
      {/* 左侧代码编辑器面板 */}
      <Panel defaultSize={codeWidth} minSize={15} maxSize={15}>
        <CurrentPageCodeDisplay codeBlocks={currentPageBlocks} />
      </Panel>
      <PanelResizeHandle className="resize-handle" />
      
      {/* 中间PDF查看器面板 */}
      <Panel defaultSize={pdfWidth} minSize={40}>
        <PDFViewer 
          filePath={filePath}
          onMetricsChange={onMetricsChange}
        >
          <CommentOverlay 
            data={comments} 
            onPDFClick={handlePDFClick}
            onMouseMove={handleMouseMove}
            previewPosition={previewPosition}
            pageMetrics={pageMetrics}
          />
          <PageBoundCodeBlocks 
            codeBlocks={allBlocks}
            page={currentPage}
            onOpenCodeEditor={handleOpenCodeEditor}
          />
          <CommentToolbar
            currentMode={commentMode}
            onModeChange={setCommentMode}
            onAddComment={handleAddComment}
            showDialog={showCommentDialog}
            pendingPosition={tempPosition}
            onCancelDialog={() => {
              setShowCommentDialog(false);
              setPreviewPosition(null);
              setTempPosition(null);
            }}
          />
        </PDFViewer>
      </Panel>
      <PanelResizeHandle className="resize-handle" />
      
      {/* 右侧评论面板 */}
      <Panel defaultSize={rightWidth} minSize={15} maxSize={40}>
        <SidePanelContainer />
      </Panel>
    </PanelGroup>
  );
};

const DisplayPage: React.FC<DisplayPageProps> = ({ filePath, username }) => {
  const [pageMetrics, setPageMetrics] = useState<PageMetrics[]>([]);
  
  return (
    <SidePanelProvider>
      <PageLayout 
        filePath={filePath} 
        username={username}
        pageMetrics={pageMetrics}
        onMetricsChange={setPageMetrics}
      />
    </SidePanelProvider>
  );
};

export default DisplayPage;
