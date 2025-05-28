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

// 定义DisplayPageProps接口
interface DisplayPageProps {
  filePath: string;
}

// 定义从后端接收的代码块数据结构
interface CodeBlockData {
  position: number[];  // 数组形式的位置 [x, y, width, height]
  language: string;
  code: string;
  page: number;
}

const PageLayout: React.FC<{ filePath: string }> = ({ filePath }) => {
  const { openPanels } = useSidePanel();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [codeBlocksRaw, setCodeBlocksRaw] = useState<CodeBlockData[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const vscode = getVsCodeApi();

  // 获取评论数据
  useEffect(() => {
    getAllComments(filePath)
      .then(setComments)
      .catch(err => console.error('加载评论失败:', err));
  }, [filePath]);

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

  // 监听消息
  useEffect(() => {
    console.log('DisplayPage设置消息监听器...');
    
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      // 打印所有收到的消息，无论类型
      console.log('DisplayPage收到消息:', message.command, message);
      
      if (message.command === 'pdfCodeBlocks') {
        try {
          // 确保正确解析数据
          const blockData = typeof message.data === 'string' 
            ? JSON.parse(message.data) 
            : message.data;
          console.log(`解析PDF代码块数据: 收到 ${Array.isArray(blockData) ? blockData.length : 0} 个代码块`);
          
          // 确保每个代码块都有必要的字段
          if (Array.isArray(blockData) && blockData.length > 0) {
            const sample = blockData[0];
            console.log("代码块示例:", {
              position: sample.position,
              language: sample.language,
              page: sample.page,
              codeLength: sample.code?.length || 0
            });
            
            const validBlocks = blockData.filter(block => 
              block && 
              Array.isArray(block.position) && 
              block.position.length === 4 &&
              typeof block.code === 'string' && 
              block.page
            );
            
            if (validBlocks.length !== blockData.length) {
              console.warn(`过滤后剩余 ${validBlocks.length}/${blockData.length} 个有效代码块`);
            }
            
            setCodeBlocksRaw(validBlocks);
          } else {
            console.warn("PDF代码块数据为空或格式不正确");
          }
        } catch (err) {
          console.error("解析代码块数据失败:", err);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // 组件挂载后立即请求代码块数据
    console.log('DisplayPage请求代码块数据，文件路径:', filePath);
    if (vscode && filePath) {
      setTimeout(() => {
        vscode.postMessage({
          command: 'requestCodeBlocks',
          filePath: filePath
        });
        console.log('已发送requestCodeBlocks请求');
      }, 500); // 增加延迟确保后端已准备好
    }
    
    return () => {
      console.log('DisplayPage移除消息监听器');
      window.removeEventListener('message', handleMessage);
    };
  }, [filePath, vscode]);

  // 转换为标准CodeBlock格式
  const codeBlocks: CodeBlock[] = codeBlocksRaw.map(block => ({
    x: block.position[0],
    y: block.position[1],
    width: block.position[2],
    height: block.position[3],
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

  // 添加处理代码块编辑的函数
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
  
  return (
    <PanelGroup direction="horizontal">
      {/* 左侧代码区域 */}
      <Panel defaultSize={codeWidth} minSize={15} maxSize={30}>
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
          <PageBoundCodeBlocks 
            codeBlocks={codeBlocks}
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
  <SidePanelProvider>
    <PageLayout filePath={filePath} />
  </SidePanelProvider>
);

export default DisplayPage;