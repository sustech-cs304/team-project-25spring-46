import React, { useState, useEffect, useCallback } from 'react';
import { SidePanelProvider, useSidePanel } from './SidePanelContext';
import PDFViewer from './PDFViewer';
import CommentOverlay from './CommentOverlay';
import PageBoundCodeBlocks from './PageBoundCodeBlocks'; // 导入新组件
import SidePanelContainer from './SidePanelContainer';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { CommentData } from '../types/annotations';
import { getAllComments } from '../../../src/commentService';
import type { CodeBlock } from './filePageComponents/CodeRecognition';
import { CurrentPageCodeDisplay } from './CurrentPageCodeDisplay';
import styles from './DisplayPage.module.css';
import { getVsCodeApi } from '../vscodeApi';
import MonacoEditor from 'react-monaco-editor';

// 定义DisplayPageProps接口
interface DisplayPageProps {
  filePath: string;
}

// 定义从后端接收的代码块数据结构
type CodeBlockJson = {
  language: string;
  code: string;
  page: number;
  position?: [number, number, number, number];
};

const PageLayout: React.FC<{ filePath: string }> = ({ filePath }) => {
  const { openPanels } = useSidePanel();
  const [comments, setComments] = useState<CommentData[]>([]);
  // const [codeBlocksRaw] = useState<CodeBlockData[]>([]);
  const [allBlocks, setAllBlocks] = useState<CodeBlock[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBlocks, setSelectedBlocks] = useState<CodeBlock[]>([]);
  const [runResults, setRunResults] = useState<{ [key: number]: string }>({}); // 以block idx为key
  const vscode = getVsCodeApi();

  const currentPageBlocks = allBlocks.filter(b => b.page === currentPage);

  useEffect(() => {
    getAllComments(filePath)
      .then(setComments)
      .catch(err => console.error('加载评论失败:', err));
  }, [filePath]);

  useEffect(() => {
    // 监听 pdfCodeBlocks 消息
    const handler = (event: MessageEvent) => {
      const { command, data, result, blockIdx } = event.data;
      if (command === 'pdfCodeBlocks') {
        const rawBlocks = JSON.parse(data);
        // 正确提取position和code字段
        const parsedBlocks = rawBlocks.map((block: CodeBlockJson) => ({
          language: block.language,
          content: block.code, // 注意是code字段
          page: block.page,
          x: block.position?.[0] ?? 0,
          y: block.position?.[1] ?? 0,
          width: block.position?.[2] ?? 0,
          height: block.position?.[3] ?? 0,
        }));
        setAllBlocks(parsedBlocks);
        setSelectedBlocks([]);
      } else if (command === 'runCodeResult') {
        console.log('收到 runCodeResult 消息:', event.data);
        const idx = typeof blockIdx === 'number' ? blockIdx
                  : (data && typeof blockIdx === 'number' ? blockIdx : undefined);
        const res = result ?? (data ? data.result : undefined);
        if (typeof idx === 'number') {
          setRunResults(prev => ({ ...prev, [idx]: res || '' }));
        } else {
          console.warn('runCodeResult missing blockIdx', event.data);
        }
      }
    };
    window.addEventListener('message', handler);
    vscode?.postMessage({ command: 'openFile', filePath });
    return () => window.removeEventListener('message', handler);
  }, [filePath, vscode]);

  useEffect(() => {
    // 当currentPage变化时，输出当前页码和当前页的代码块
    // const blocks = allBlocks.filter(b => b.page === currentPage);
    // console.log(`当前页码: ${currentPage}`);
    // console.log('当前页面中的代码块:', blocks);
  }, [currentPage, allBlocks]);

  // 代码块边框渲染组件
  function CodeBlockBorders({ page }: { page: number }) {
    // 只渲染当前页的代码块
    return (
      <>
        {allBlocks.filter(b => b.page === page).map((block, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${block.x * 100}%`,
              top: `${block.y * 100}%`,
              width: `${block.width * 100}%`,
              height: `${block.height * 100}%`,
              border: '2px solid #f39c12',
              boxSizing: 'border-box',
              cursor: 'pointer',
              zIndex: 10,
              background: 'rgba(255, 230, 180, 0.08)',
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
              页码: {block.page}<br />
              x: {(block.x * 100).toFixed(2)}%<br />
              y: {(block.y * 100).toFixed(2)}%<br />
              w: {(block.width * 100).toFixed(2)}%<br />
              h: {(block.height * 100).toFixed(2)}%
            </div>
          </div>
        ))}
      </>
    );
  }

  // 添加处理代码块编辑的函数
  const handleOpenCodeEditor = useCallback((block: CodeBlock) => {
    if (vscode) {
      vscode.postMessage({
        command: 'openCodeInEditor',
        code: block.content,
        language: block.language || 'text',
      });
    }
  }, [vscode]);

  // 编辑器运行代码
  const handleRunCode = (block: CodeBlock, idx: number) => {
    vscode?.postMessage({
      command: 'runCode',
      code: block.content,
      language: normalizeLanguage(block.language),
      blockIdx: idx
    });
    setRunResults(prev => ({ ...prev, [idx]: '正在运行...' }));
  };

  function normalizeLanguage(lang: string) {
    if (!lang) return 'Python';
    const l = lang.trim().toLowerCase();
    if (l === 'python' || l === 'python3') return 'Python';
    if (l === 'c++' || l === 'cpp') return 'C++';
    if (l === 'c') return 'C';
    if (l === 'java') return 'Java';
    return 'Python'; // 默认
  }

  if (openPanels.length === 0) {
    return (
      <div style={{ display: 'flex', height: '100vh' }}>
        {/* 左侧代码编辑器区 */}
        <div style={{ width: '20%', background: '#f8f8fa', overflowY: 'auto', padding: 8 }}>
          {selectedBlocks.map((block, idx) => (
            <div key={idx} style={{ marginBottom: 16, position: 'relative', background: '#fff', borderRadius: 6, boxShadow: '0 1px 4px #eee', padding: 8 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {block.language}
                <button
                  style={{ fontSize: 12, background: '#3498db', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}
                  onClick={() => handleRunCode(block, idx)}
                >运行</button>
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
          ))}
        </div>
        {/* 中间PDF */}
        <div style={{ width: '60%', position: 'relative' }}>
          <PDFViewer filePath={filePath} onPageChange={setCurrentPage}>
            <CodeBlockBorders page={currentPage} />
          </PDFViewer>
        </div>
        {/* 右侧评论区 */}
        <div style={{ width: '20%', background: '#f8f8fa' }}>
          {/* 评论区内容 */}
        </div>
      </div>
    );
  }

  // 布局分配
  const codeWidth = 15;
  const pdfWidth = 70;
  const rightWidth = 15;
  
  return (
    <PanelGroup direction="horizontal">
      {/* 左侧代码区域 */}
      <Panel defaultSize={codeWidth} minSize={15} maxSize={15}>
        <CurrentPageCodeDisplay codeBlocks={currentPageBlocks} />
      </Panel>
      <PanelResizeHandle className={styles.resizeHandle} />
      
      {/* 中间PDF区域 */}
      <Panel defaultSize={pdfWidth} minSize={40}>
        <PDFViewer 
          filePath={filePath}
          onPageChange={setCurrentPage}
        >
          <CommentOverlay data={comments} />
          <PageBoundCodeBlocks 
            codeBlocks={allBlocks}
            page={currentPage}
            onOpenCodeEditor={handleOpenCodeEditor}
          />
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

const DisplayPage: React.FC<DisplayPageProps> = ({ filePath }) => (
  <PDFViewer filePath={filePath}>
    <SidePanelProvider>
      <PageLayout filePath={filePath} />
    </SidePanelProvider>
  </PDFViewer>
);

export default DisplayPage;