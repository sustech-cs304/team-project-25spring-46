import React, { useState, useEffect, useCallback } from 'react';
import { SidePanelProvider, useSidePanel } from './SidePanelContext';
import PDFViewer /*, { usePDFMetrics }*/ from './PDFViewer';
import CommentOverlay from './CommentOverlay';
import CommentToolbar, { CommentPosition, CommentMode } from './CommentToolbar';
import SidePanelContainer from './SidePanelContainer';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { CommentData, RawCommentInput } from '../types/annotations';
import type { CodeBlock } from './filePageComponents/CodeRecognition';
import { CurrentPageCodeDisplay } from './CurrentPageCodeDisplay';
import styles from './DisplayPage.module.css';
import { getVsCodeApi } from '../vscodeApi';
import MonacoEditor from 'react-monaco-editor';

// 定义DisplayPageProps接口
interface DisplayPageProps {
  filePath: string;
  username: string;
}

// 定义从后端接收的代码块数据结构
type CodeBlockJson = {
  language: string;
  code: string;
  page: number;
  position?: [number, number, number, number];
};

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

  // 添加定时刷新评论的函数
  const refreshComments = useCallback(() => {
    console.log('Refreshing comments...');
    vscode?.postMessage({ command: 'getAllComments', filePath });
  }, [filePath, vscode]);

  // 只在 filePath 变化时读取一次评论和代码块
  useEffect(() => {
    vscode.postMessage({ command: 'openFile', filePath });
    vscode.postMessage({ command: 'getAllComments', filePath });
    vscode.postMessage({ command: 'runCodeRecognition', filePath });
    // 清空旧数据
    setAllBlocks([]);
    setSelectedBlocks([]);
    setCodeBlockError(null);
    setComments([]);
  }, [filePath, vscode]);

  // 添加定时刷新评论的 effect
  useEffect(() => {
    // 立即执行一次
    refreshComments();

    // 设置5秒定时器
    const intervalId = setInterval(refreshComments, 5000);

    // 清理函数
    return () => {
      clearInterval(intervalId);
    };
  }, [refreshComments]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const { command, data, result, blockIdx, comments: commentList } = event.data;
      if (command === 'pdfCodeBlocks') {
        if (!data) {
          setCodeBlockError('未找到对应的代码块 JSON 文件');
          setAllBlocks([]);
          return;
        }
        try {
          const rawBlocks = JSON.parse(data);
          if (!Array.isArray(rawBlocks) || rawBlocks.length === 0) {
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
        } catch {
          setCodeBlockError('未找到对应的代码块 JSON 文件');
          setAllBlocks([]);
        }
      } else if (command === 'runCodeResult') {
        const idx = typeof blockIdx === 'number' ? blockIdx
                  : (data && typeof blockIdx === 'number' ? blockIdx : undefined);
        const res = result ?? (data ? data.result : undefined);
        if (typeof idx === 'number') {
          setRunResults(prev => ({ ...prev, [idx]: res || '' }));
        }
      } else if (command === 'getAllCommentsSuccess' && Array.isArray(commentList)) {
        console.log('getAllCommentsSuccess', commentList);
        setComments(commentList);
      } else if (command === 'getAllCommentsError') {
        console.log('getAllCommentsError');
        setComments([]);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [filePath, vscode]);

  // 代码块边框渲染组件，接收 page 参数
  const CodeBlockBorders: React.FC<{ page: number }> = ({ page }) => {
    if (codeBlockError) return null;
    return (
      <>
        {allBlocks.filter(block => block.page === page).map((block, idx) => (
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
      </>
    );
  };

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

  if (openPanels.length === 0) {
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
                <MonacoEditor
                  height="120"
                  language={block.language.toLowerCase()}
                  value={block.content}
                  options={{ readOnly: false, minimap: { enabled: false } }}
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
                pendingPosition={previewPosition}
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
  }

  return (
    <PanelGroup direction="horizontal" style={{ height: 'calc(100vh - 72px)' }}>
      <Panel defaultSize={20} minSize={15} maxSize={25}>
        <CurrentPageCodeDisplay codeBlocks={allBlocks.filter(b => b.page === currentPage)} />
      </Panel>
      <PanelResizeHandle className={styles.resizeHandle} />
      
      <Panel defaultSize={60} minSize={40}>
        <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
          <PDFViewer 
            filePath={filePath}
            onPageChange={setCurrentPage}
            onMouseDown={handlePDFClick}
            onMouseMove={handleMouseMove}
          >
            {codeBlockError && (
              <div style={{ position: 'absolute', top: 20, left: 0, right: 0, zIndex: 100, color: 'red', textAlign: 'center', fontWeight: 'bold', background: 'rgba(255,255,255,0.9)', padding: 12, borderRadius: 8 }}>
                {codeBlockError}
              </div>
            )}
            <CodeBlockBorders page={currentPage} />
            <CommentOverlay 
              comments={comments} 
              previewPosition={previewPosition}
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
                pendingPosition={previewPosition}
                onCancelDialog={() => {
                  setShowDialog(false);
                  setPreviewPosition(null);
                  setTempPosition(null);
                }}
              />
            </div>
          </div>
        </div>
      </Panel>
      <PanelResizeHandle className={styles.resizeHandle} />
      
      <Panel defaultSize={20} minSize={15} maxSize={30}>
        {openPanels.length > 0 ? (
          <SidePanelContainer />
        ) : (
          <div className="h-full bg-transparent p-4 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div>点击PDF上的评论或代码以在此处查看详情</div>
            </div>
          </div>
        )}
      </Panel>
    </PanelGroup>
  );
};

const DisplayPage: React.FC<DisplayPageProps> = ({ filePath, username }) => (
    <SidePanelProvider>
      <PageLayout filePath={filePath} username={username} />
    </SidePanelProvider>
);

export default DisplayPage;