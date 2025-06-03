import React, { useState, useEffect, useCallback } from 'react';
import { SidePanelProvider, useSidePanel } from './SidePanelContext';
import PDFViewer /*, { usePDFMetrics }*/ from './PDFViewer';
import CommentOverlay from './CommentOverlay';
import CommentToolbar, { CommentPosition, CommentMode } from './CommentToolbar';
import SidePanelContainer from './SidePanelContainer';
import { getVsCodeApi } from '../vscodeApi';
import { CommentData, RawCommentInput } from '../types/annotations';
import type { CodeBlock } from './filePageComponents/CodeRecognition';

// 定义DisplayPageProps接口
interface DisplayPageProps {
  filePath: string;
  username: string;
}

// 定义从后端接收的代码块数据结构
interface CodeBlockJson {
  language: string;
  code: string;
  page: number;
  position?: [number, number, number, number];
}

const PageLayout: React.FC<{ filePath: string; username: string }> = ({ filePath, username }) => {
  const { openPanels } = useSidePanel();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [allBlocks, setAllBlocks] = useState<CodeBlock[]>([]);
  const [codeBlockError, setCodeBlockError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBlocks, setSelectedBlocks] = useState<CodeBlock[]>([]);
  const [runResults, setRunResults] = useState<{ [key: number]: string }>({});
  const [previewPosition, setPreviewPosition] = useState<CommentPosition | null>(null);
  const [currentMode, setCurrentMode] = useState<CommentMode>('none');
  const [showDialog, setShowDialog] = useState(false);
  const [tempPosition, setTempPosition] = useState<CommentPosition | null>(null);
  const vscode = getVsCodeApi();
  // const pageMetrics = usePDFMetrics();

  // 修改文件打开时的 useEffect
  useEffect(() => {
    // 发送 openFile 命令和代码块识别命令
    vscode.postMessage({ command: 'openFile', filePath });
    setComments([]);
    setRunResults({});
  }, [filePath, vscode]);

  // 文件打开时的一次性初始化
  useEffect(() => {
    console.log('[Init] File opened, initializing data...');
    // 发送初始化命令
    vscode.postMessage({ command: 'openFile', filePath });
    
    // 只清空评论相关数据
    setComments([]);
    setRunResults({});
  }, [filePath, vscode]);

  // 评论刷新
  useEffect(() => {
    console.log('[Comments Refresh] Setting up comments refresh...');
    const refreshComments = () => {
      console.log('[Comments Refresh] Refreshing comments, current code blocks:', allBlocks);
      vscode.postMessage({ command: 'getAllComments', filePath });
    };

    // 立即执行一次
    refreshComments();

    // 设置5秒定时器
    const intervalId = setInterval(refreshComments, 5000);

    // 清理函数
    return () => {
      console.log('[Comments Refresh] Cleaning up refresh timer');
      clearInterval(intervalId);
    };
  }, [filePath, vscode, allBlocks]);

  // 分离代码块消息处理
  useEffect(() => {
    console.log('Setting up code blocks handler');
    const handler = (event: MessageEvent) => {
      const { command, data } = event.data;
      
      if (command !== 'pdfCodeBlocks') return;
      
      console.log('[CodeBlocks Handler] Processing code blocks data:', data);
      if (!data) {
        console.error('[CodeBlocks Handler] No code blocks data received');
        setCodeBlockError('未找到对应的代码块 JSON 文件');
        setAllBlocks([]);
        return;
      }
      try {
        const rawBlocks = JSON.parse(data);
        
        if (!Array.isArray(rawBlocks) || rawBlocks.length === 0) {
          console.error('[CodeBlocks Handler] Code blocks data is empty or invalid');
          setCodeBlockError('未找到对应的代码块 JSON 文件或内容为空');
          setAllBlocks([]);
          return;
        }
        const parsedBlocks = rawBlocks.map((block: CodeBlockJson) => ({
          language: block.language,
          content: block.code,
          page: block.page,
          x: block.position?.[0] ?? 0,
          y: block.position?.[1] ?? 0,
          width: block.position?.[2] ?? 0,
          height: block.position?.[3] ?? 0,
        }));
        setAllBlocks(parsedBlocks);
        setCodeBlockError(null);
      } catch (error) {
        console.error('[CodeBlocks Handler] Error parsing code blocks:', error);
        setCodeBlockError('未找到对应的代码块 JSON 文件');
        setAllBlocks([]);
      }
    };

    window.addEventListener('message', handler);
    return () => {
      console.log('Cleaning up code blocks handler');
      window.removeEventListener('message', handler);
    };
  }, []);

  // 分离评论和代码运行结果消息处理
  useEffect(() => {
    console.log('Setting up comments and run results handler');
    const handler = (event: MessageEvent) => {
      const { command, data, result, blockIdx, comments: commentList } = event.data;
      let idx: number | undefined;
      let res: string | undefined;
      
      switch (command) {
        case 'getAllCommentsSuccess':
          if (Array.isArray(commentList)) {
            console.log('[Comments Handler] getAllCommentsSuccess', commentList);
            setComments(commentList);
          }
          break;

        case 'getAllCommentsError':
          console.log('[Comments Handler] getAllCommentsError');
          setComments([]);
          break;

        case 'runCodeResult':
          console.log('[Run Result Handler] Processing run result');
          idx = typeof blockIdx === 'number' ? blockIdx
               : (data && typeof blockIdx === 'number' ? blockIdx : undefined);
          res = result ?? (data ? data.result : undefined);
          if (typeof idx === 'number') {
            setRunResults(prev => {
              const newResults = { ...prev };
              newResults[idx as number] = res || '';
              return newResults;
            });
          }
          break;
      }
    };

    window.addEventListener('message', handler);
    return () => {
      console.log('Cleaning up comments and run results handler');
      window.removeEventListener('message', handler);
    };
  }, [allBlocks]);

  // 代码块边框渲染组件，接收 page 参数
  const CodeBlockBorders: React.FC<{ page: number }> = ({ page }) => {
    if (codeBlockError) return null;

    const pageBlocks = allBlocks.filter(block => block.page === page);

    return (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 30
      }}>
        {pageBlocks.map((block, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${block.x * 100}%`,
              top: `${block.y * 100}%`,
              width: `${block.width * 100}%`,
              height: `${block.height * 100}%`,
              border: '2px solid #3498db',
              boxSizing: 'border-box',
              cursor: 'pointer',
              zIndex: 30,
              background: 'rgba(52, 152, 219, 0.08)',
              color: '#333',
              fontSize: 10,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              gap: 12,
              pointerEvents: 'auto',
            }}
            title={block.language}
            onClick={e => {
              e.stopPropagation();
              setSelectedBlocks(prev => prev.some(b => b === block) ? prev : [...prev, block]);
            }}
          >
            <div style={{ background: 'rgba(255,255,255,0.7)', padding: '2px 4px', borderRadius: 2 }}>
              {block.language}
            </div>
          </div>
        ))}
      </div>
    );
  };

  CodeBlockBorders.displayName = 'CodeAnnotation';

  const normalizeLanguage = useCallback((lang: string) => {
    if (!lang) return 'Python';
    const l = lang.trim().toLowerCase();
    if (l === 'python' || l === 'python3') return 'Python';
    if (l === 'c++' || l === 'cpp') return 'C++';
    if (l === 'c') return 'C';
    if (l === 'java') return 'Java';
    return 'Python';
  }, []);

  // 运行代码
  const handleRunCode = useCallback((block: CodeBlock, idx: number) => {
    vscode?.postMessage({
      command: 'runCodeBlock',
      code: block.content,
      language: normalizeLanguage(block.language),
      blockIdx: idx
    });
    setRunResults(prev => ({ ...prev, [idx]: '正在运行...' }));
  }, [normalizeLanguage, vscode]);

  const handleCommentSubmit = useCallback((comment: {
    type: CommentMode;
    position: CommentPosition;
    content: string;
  }) => {
    console.log('handleCommentSubmit: 添加评论, comment =', comment);

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

    vscode?.postMessage({
      command: 'addComment',
      data: {
        filePath,
        comment: commentInput
      }
    });

    if (type === 'text') {
      const newComment: CommentData = {
        id: Date.now().toString(),
        page: position.page,
        type: 'text',
        content,
        position: {
          x: position.x1,
          y: position.y1
        },
        author: username,
        time: new Date().toISOString(),
      };
      setComments(prev => [...prev, newComment]);
      setTempPosition(null);
      setShowDialog(false);
    } else if (type === 'highlight') {
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
      setTempPosition(null);
      setShowDialog(false);
    } else if (type === 'underline') {
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
      setTempPosition(null);
      setShowDialog(false);
    }
  }, [filePath, username, vscode]);

  const handlePDFClick = useCallback((e: React.MouseEvent) => {
    if (currentMode === 'none') return;

    console.log('handlePDFClick: 点击事件');

    const toolbar = document.querySelector('.comment-toolbar');
    if (toolbar && toolbar.contains(e.target as Node)) return;

    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top + scrollTop;

    // 使用 pageMetrics 判断点击的是哪个页面
    const pageMetrics = document.querySelectorAll('.mx-auto.relative.mb-6');
    let pageIndex = -1;
    let pageRect = null;

    for (let i = 0; i < pageMetrics.length; i++) {
      const page = pageMetrics[i];
      const rect = page.getBoundingClientRect();
      const pageTop = rect.top - container.getBoundingClientRect().top + scrollTop;
      const pageBottom = pageTop + rect.height;

      if (clickY >= pageTop && clickY <= pageBottom) {
        pageIndex = i;
        pageRect = rect;
        break;
      }
    }

    console.log('handlePDFClick: 点击事件, pageIndex =', pageIndex);
    if (pageIndex === -1 || !pageRect) return;

    // 计算相对于当前页面的坐标
    const relativeY = clickY - (pageRect.top - container.getBoundingClientRect().top + scrollTop);
    const x = (clickX - (pageRect.left - rect.left)) / pageRect.width;
    const y = relativeY / pageRect.height;

    console.log('handlePDFClick: 相对坐标 (', x, y, ')');

    const basePosition: CommentPosition = {
      type: currentMode,
      x1: parseFloat(x.toFixed(6)),
      y1: parseFloat(y.toFixed(6)),
      page: pageIndex + 1
    };

    console.log('handlePDFClick: 点击事件, 设置临时位置: (', basePosition.x1, basePosition.y1, ')');

    if (currentMode === 'text') {
      setTempPosition(basePosition);
      setShowDialog(true);
      console.log('handlePDFClick: text, 点击事件, 显示评论输入框');
    } else if (currentMode === 'highlight') {
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
        setShowDialog(true);
        console.log('handlePDFClick: highlight, 第二次点击事件, 最终位置: (', newPosition.x1, newPosition.y1, newPosition.width, newPosition.height, ')');
      }
    } else if (currentMode === 'underline') {
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
        setShowDialog(true);
        console.log('handlePDFClick: underline, 第二次点击事件, 最终位置: (', newPosition.x1, newPosition.y1, newPosition.x2, newPosition.y2, ')');
      }
    }
  }, [currentMode, tempPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (currentMode === 'none' || !tempPosition) return;
    if (tempPosition.type === 'text') return;

    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top + scrollTop;

    const pageMetrics = document.querySelectorAll('.mx-auto.relative.mb-6');
    let pageIndex = -1;
    let pageRect = null;

    for (let i = 0; i < pageMetrics.length; i++) {
      const page = pageMetrics[i];
      const rect = page.getBoundingClientRect();
      const pageTop = rect.top - container.getBoundingClientRect().top + scrollTop;
      const pageBottom = pageTop + rect.height;

      if (clickY >= pageTop && clickY <= pageBottom) {
        pageIndex = i;
        pageRect = rect;
        break;
      }
    }

    if (pageIndex === -1 || pageIndex + 1 !== tempPosition.page || !pageRect) return;

    // 计算相对于当前页面的坐标
    const relativeY = clickY - (pageRect.top - container.getBoundingClientRect().top + scrollTop);
    const x = (clickX - (pageRect.left - rect.left)) / pageRect.width;
    const y = relativeY / pageRect.height;

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
  }, [currentMode, tempPosition]);

  // 并列三栏布局：左侧代码编辑器，中间PDF，右侧评论面板
  return (
    <div style={{ display: 'flex', height: '100vh', position: 'relative' }}>
      {/* 左侧代码编辑面板 */}
      <div style={{ 
        width: '20%', 
        background: 'transparent', 
        overflowY: 'auto', 
        padding: 8,
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 20
      }}>
        {selectedBlocks.length > 0 ? (
          selectedBlocks.map((block, idx) => (
            <div key={idx} style={{ marginBottom: 16, position: 'relative', background: '#fff', borderRadius: 6, boxShadow: '0 1px 4px #eee', padding: 8 }}>
              <button
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  background: 'transparent',
                  border: 'none',
                  color: '#aaa',
                  fontSize: 16,
                  cursor: 'pointer',
                  zIndex: 2,
                }}
                title="关闭"
                onClick={() => setSelectedBlocks(prev => prev.filter(b => b !== block))}
              >×</button>
              <div style={{ fontWeight: 'bold', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 12 }}>
                <button
                  style={{ fontSize: 12, background: '#3498db', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', marginRight: 8 }}
                  onClick={() => handleRunCode(block, idx)}
                >运行</button>
                <span>
                  {block.language}
                  <span style={{ color: '#888', fontWeight: 'normal', marginLeft: 8 }}>第{block.page}页</span>
                </span>
              </div>
              <textarea
                style={{ width: '100%', minHeight: 100, fontFamily: 'monospace', fontSize: 13, border: '1px solid #eee', borderRadius: 4, padding: 8, resize: 'vertical', background: '#fafbfc', color: '#222', marginBottom: 8 }}
                value={block.content}
                onChange={e => {
                  const newContent = e.target.value;
                  setSelectedBlocks(prev => prev.map((b, i) => i === idx ? { ...b, content: newContent } : b));
                }}
                spellCheck={false}
                readOnly={false}
                tabIndex={0}
                onContextMenu={() => {}}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#333', background: '#f6f6f6', borderRadius: 4, padding: 6, minHeight: 24 }}>
                {runResults[idx] && <div>运行结果：<pre style={{ margin: 0 }}>{runResults[idx]}</pre></div>}
              </div>
            </div>
          ))
        ) : (
          <div className="h-full bg-transparent p-4 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div>点击PDF上的代码块以在此处查看和编辑</div>
            </div>
          </div>
        )}
      </div>

      {/* PDF查看器 */}
      <div style={{ 
        width: '60%', 
        position: 'relative',
        marginLeft: '20%',
        height: '100vh',
        zIndex: 10
      }}>
        <PDFViewer 
          filePath={filePath} 
          onPageChange={setCurrentPage}
          onMouseDown={handlePDFClick}
          onMouseMove={handleMouseMove}
        >
          <CodeBlockBorders page={currentPage} />
          <CommentOverlay 
            comments={comments} 
            previewPosition={previewPosition}
            page={currentPage}
          />
        </PDFViewer>
        <div style={{ 
          position: 'absolute', 
          bottom: 20, 
          right: 20, 
          zIndex: 9999,
          pointerEvents: 'none'
        }}>
          <div style={{ pointerEvents: 'auto' }}>
            <CommentToolbar
              currentMode={currentMode}
              onModeChange={setCurrentMode}
              onAddComment={handleCommentSubmit}
              showDialog={showDialog}
              pendingPosition={tempPosition}
              onCancelDialog={() => {
                setShowDialog(false);
                setPreviewPosition(null);
                setTempPosition(null);
              }}
            />
          </div>
        </div>
      </div>

      {/* 右侧评论面板 */}
      <div style={{ 
        width: '20%', 
        background: 'transparent',
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 20,
        overflowY: 'auto'
      }}>
        {openPanels.length > 0 ? (
          <SidePanelContainer />
        ) : (
          <div className="h-full bg-transparent p-4 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div>点击PDF上的评论或代码以在此处查看详情</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DisplayPage: React.FC<DisplayPageProps> = ({ filePath, username }) => (
    <SidePanelProvider>
      <PageLayout filePath={filePath} username={username} />
    </SidePanelProvider>
);

export default DisplayPage;