// src/pages/DisplayPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { SidePanelProvider, useSidePanel } from './SidePanelContext';
import PDFViewer from './PDFViewer';
import CommentOverlay from './CommentOverlay';
import SidePanelContainer from './SidePanelContainer';
import CommentToolbar, { CommentMode } from './CommentToolbar';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { CommentData, RawCommentInput } from '../types/annotations';
import { getVsCodeApi } from '../vscodeApi';
import { usePDFMetrics } from './PDFViewer';
// import { getAllComments } from '../../../src/commentService';
import type { CodeBlock } from './filePageComponents/CodeRecognition';
import { CurrentPageCodeDisplay } from './CurrentPageCodeDisplay';
import styles from './DisplayPage.module.css';
import SimpleCodeBlockOverlay from './SimpleCodeBlockOverlay'; // 导入新的覆盖层组件

// 定义DisplayPageProps接口
interface DisplayPageProps {
  filePath: string;
  username: string;
}

// 定义从后端接收的代码块数据结构
interface CodeBlockData {
  position: number[];  // 数组形式的位置 [x, y, width, height]
  language: string;
  code: string;
  page: number;
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

const PageLayout: React.FC<{ filePath: string, username: string }> = ({ filePath, username }) => {
  console.log('PageLayout: 已进入, filePath =', filePath);
  const { openPanels } = useSidePanel();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentMode, setCommentMode] = useState<CommentMode>('none');
  const [tempPosition, setTempPosition] = useState<CommentPosition | null>(null);
  const [previewPosition, setPreviewPosition] = useState<CommentPosition | null>(null);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const pageMetrics = usePDFMetrics();

  // 获取评论
  const [codeBlocksRaw, setCodeBlocksRaw] = useState<CodeBlockData[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const vscode = getVsCodeApi();

  // 获取评论数据
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
          // ...(position.width && { width: position.width }),
          // ...(position.height && { height: position.height }),
          // ...(position.x2 && { x2: position.x2 }),
          // ...(position.y2 && { y2: position.y2 })
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

    // const rect = e.currentTarget.getBoundingClientRect();
    // const x = (e.clientX - rect.left) / rect.width;
    // const y = (e.clientY - rect.top) / rect.height;
    // const pageIndex = pageMetrics.findIndex(metric => 
    //   e.clientY >= metric.offsetY && e.clientY <= metric.offsetY + metric.height
    // );

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
  
    // const rect = e.currentTarget.getBoundingClientRect();
    // const x = (e.clientX - rect.left) / rect.width;
    // const y = (e.clientY - rect.top) / rect.height;

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
    // console.log('handleMouseMove: 鼠标移动事件, 最终位置: (', previewPosition?.x1, previewPosition?.y1, previewPosition?.x2, previewPosition?.y2, ')');
  }, [commentMode, previewPosition, tempPosition]);

  // 判断侧边栏
  const hasCode = openPanels.some(p => p.type === 'code');
  const left = hasCode ? 70 : 80;
  // const right = 100 - left;

  const renderContent = () => (
    <>
      <CommentOverlay 
        data={comments} 
        onPDFClick={handlePDFClick}
        onMouseMove={handleMouseMove}
        previewPosition={previewPosition}
      />
      {/* 添加新的代码块覆盖层，不依赖位置信息 */}
      <SimpleCodeBlockOverlay codeBlocks={codeBlocks} page={currentPage} />
      <CommentToolbar
        currentMode={commentMode}
        onModeChange={setCommentMode}
        onAddComment={handleAddComment}
        showDialog={showCommentDialog}
        pendingPosition={tempPosition}
        onCancelDialog={() => {
          setShowCommentDialog(false)
          setPreviewPosition(null);
          setTempPosition(null);
        }}
      />
    </>
  );

  // 组件挂载时主动请求代码块数据
  useEffect(() => {
    console.log('DisplayPage请求代码块数据，文件路径:', filePath);
    if (vscode && filePath) {
      vscode.postMessage({
        command: 'requestCodeBlocks',
        filePath: filePath
      });
    }
  }, [filePath, vscode]);

  // 监听消息并请求代码块数据
  useEffect(() => {
    console.log('DisplayPage设置消息监听器...');
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      console.log('DisplayPage收到消息:', message.command, message);

      if (message.command === 'pdfCodeBlocks') {
        try {
          const blockData = typeof message.data === 'string'
            ? JSON.parse(message.data)
            : message.data;
          console.log(`解析PDF代码块数据: 收到 ${Array.isArray(blockData) ? blockData.length : 0} 个代码块`);
          if (Array.isArray(blockData) && blockData.length > 0) {
            const validBlocks = blockData.map(block => ({
              position: [0, 0, 0, 0], // 位置无用
              language: block.language || 'unknown',
              code: block.code || '',
              page: block.page || 1
            })).filter(block => block.code && block.page);
            setCodeBlocksRaw(validBlocks);
          }
        } catch (err) {
          console.error("解析代码块数据失败:", err);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // 组件挂载后立即请求
    if (vscode && filePath) {
      console.log('DisplayPage请求代码块数据，文件路径:', filePath);
      vscode.postMessage({
        command: 'requestCodeBlocks',
        filePath: filePath
      });
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [filePath, vscode]);

  // 转换为标准CodeBlock格式
  const codeBlocks: CodeBlock[] = codeBlocksRaw.map(block => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    language: block.language || 'unknown',
    content: block.code,
    page: block.page,
  }));

  // 过滤当前页面的代码块
  const currentPageCodeBlocks = codeBlocks.filter(block => block.page === currentPage);

  // 布局分配
  const codeWidth = 15;
  const pdfWidth = 70;
  const rightWidth = 15;
  
  return (
    <PanelGroup direction="horizontal">
      <Panel defaultSize={left}>
        {renderContent()}
      </Panel>
      {/* 左侧代码区域 */}
      <Panel defaultSize={codeWidth} minSize={codeWidth} maxSize={30}>
        <CurrentPageCodeDisplay codeBlocks={currentPageCodeBlocks} />
      </Panel>
      <PanelResizeHandle className={styles.resizeHandle} />
      
      {/* 中间PDF区域 */}
      <Panel defaultSize={pdfWidth} minSize={40}>
        <PDFViewer 
          filePath={filePath}
          onPageChange={setCurrentPage}
        >
          <CommentOverlay data={comments} />
          {/* 添加新的覆盖层组件 */}
          <SimpleCodeBlockOverlay codeBlocks={codeBlocks} page={currentPage} />
        </PDFViewer>
      </Panel>
      <PanelResizeHandle className={styles.resizeHandle} />
      
      {/* 右侧区域 */}
      <Panel defaultSize={rightWidth} minSize={15} maxSize={40}>
        {openPanels.length > 0 ? (
          <SidePanelContainer />
        ) : (
          <div className="h-full bg-gray-50 p-4 flex items-center justify-center text-gray-400">
            {/* 右侧区域占位内容 */}
            <div className="text-center">
              <div className="mb-2">✨</div>
              <div>点击PDF上的评论或代码以在此处查看详情</div>
            </div>
          </div>
        )}
      </Panel>
    </PanelGroup>
  );
};

// 修复 DisplayPage 组件返回的嵌套结构
const DisplayPage: React.FC<DisplayPageProps> = ({ filePath, username }) => {
  console.log('已进入 DisplayPage, filePath =', filePath);

  return (
    <SidePanelProvider>
      <PageLayout filePath={filePath} username={username} />
    </SidePanelProvider>
  );
};

export default DisplayPage;