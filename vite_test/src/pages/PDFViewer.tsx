// src/pages/PDFViewer.tsx
import React, { useState, useEffect, useRef, createContext, useContext } from "react";
import * as pdfjs from "pdfjs-dist";
import { PDFDocumentProxy } from "pdfjs-dist";
import { getVsCodeApi } from "../vscodeApi";

type PageMetrics = {
  width: number;
  height: number;
  offsetY: number;
};

interface PDFContextValue {
  pageMetrics: PageMetrics[];
}

const PDFContext = createContext<PDFContextValue | null>(null);

interface PDFViewerProps {
  filePath: string;
  children?: React.ReactNode;
  onPageChange?: (pageNumber: number) => void; // 添加页面变化的回调
}

// 1. 首先，添加一个类型声明，描述可以接收 page 属性的组件
interface WithPageProps {
  page?: number;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ filePath, children, onPageChange }) => {
  const [workerPath, setWorkerPath] = useState<string | null>(null);
  const [pdfPath, setPdfPath] = useState<string>('');
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageMetrics, setPageMetrics] = useState<PageMetrics[]>([]);
  const canvasRefs = useRef<HTMLCanvasElement[]>([]);
  const vscode = getVsCodeApi();

  // ——— 1. 请求并接收 Worker 路径 ———
  useEffect(() => {
    console.log("Now Loading PDFViewer: filePath:", filePath);
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.command === "PdfWorkerPath") {
        console.log("接收到PDF Worker路径:", msg.path);
        setWorkerPath(msg.path);
      }
      if (msg.command === "PdfPath") {
        console.log("接收到PDF文件路径:", msg.path);
        setPdfPath(msg.path);
      }
      if (msg.command === "error") {
        console.error("接收到错误:", msg.error);
      }
    };
    window.addEventListener("message", handleMessage);
    vscode?.postMessage({ command: "getPdfWorkerPath" });
    vscode?.postMessage({ command: "getPdfPath", path: filePath });
    return () => window.removeEventListener("message", handleMessage);
  }, [vscode, filePath]);

  // ——— 2. 拿到 workerPath 后，加载 PDF ———
  useEffect(() => {
    console.log("准备加载PDF, path:", pdfPath, "worker path:", workerPath);
    if (!pdfPath || !workerPath) return;
    
    try {
      // 确保正确设置worker
      pdfjs.GlobalWorkerOptions.workerSrc = workerPath;
      
      let cancelled = false;
      (async () => {
        try {
          console.log("开始加载PDF文档...");
          const loadingTask = pdfjs.getDocument({
            url: pdfPath,
            disableRange: false, // 尝试启用范围请求
            cMapUrl: "./cmaps/", // 可能需要包含CMap文件
            cMapPacked: true,
          });

          const pdf = await loadingTask.promise;
          console.log("PDF文档加载成功, 页数:", pdf.numPages);
          
          if (cancelled) return;
          setPdfDoc(pdf);

          const metrics: PageMetrics[] = [];
          let cumulativeOffset = 0;
          const scale = 1.0;

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale });
            metrics.push({
              width: viewport.width,
              height: viewport.height,
              offsetY: cumulativeOffset
            });
            cumulativeOffset += viewport.height + 10;
          }

          if (!cancelled) {
            setPageMetrics(metrics);
          }
        } catch (err) {
          console.error("PDF 加载失败:", err);
        }
      })();

      return () => { cancelled = true; };
    } catch (error) {
      console.error("PDF初始化错误:", error);
    }
  }, [pdfPath, workerPath]);

  // ——— 3. PDFDocumentProxy 就绪后，渲染到 canvas ———
  useEffect(() => {
    if (!pdfDoc || pageMetrics.length === 0) return;
    const scale = 1.0;
    pageMetrics.forEach((_, i) => {
      const canvas = canvasRefs.current[i];
      if (!canvas) return;
      pdfDoc.getPage(i + 1).then((page) => {
        const vp = page.getViewport({ scale });
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext("2d");
        if (ctx) page.render({ canvasContext: ctx, viewport: vp });
      });
    });
  }, [pdfDoc, pageMetrics]);

  // 添加页面检测逻辑
  useEffect(() => {
    const checkVisiblePage = () => {
      const container = document.querySelector('.relative.bg-gray-100.overflow-auto.h-full');
      if (!container) return;
      
      const pages = Array.from(container.querySelectorAll('.mx-auto.relative.mb-2'));
      if (pages.length === 0) return;
      
      const containerRect = container.getBoundingClientRect();
      
      let mostVisiblePage = 0;
      let maxVisibleArea = 0;
      
      pages.forEach((page, index) => {
        const pageRect = page.getBoundingClientRect();
        const visibleTop = Math.max(pageRect.top, containerRect.top);
        const visibleBottom = Math.min(pageRect.bottom, containerRect.bottom);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const visibleArea = visibleHeight * pageRect.width;
        
        if (visibleArea > maxVisibleArea) {
          maxVisibleArea = visibleArea;
          mostVisiblePage = index;
        }
      });
      
      // 页码从1开始
      const currentPageNumber = mostVisiblePage + 1;
      if (onPageChange) {
        onPageChange(currentPageNumber);
      }
    };
    
    const container = document.querySelector('.relative.bg-gray-100.overflow-auto.h-full');
    if (container) {
      container.addEventListener('scroll', checkVisiblePage);
      // 初始检查
      setTimeout(checkVisiblePage, 500);
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkVisiblePage);
      }
    };
  }, [pageMetrics.length, onPageChange]);

  if (pageMetrics.length === 0) {
    return <div className="text-center text-gray-500">Loading PDF…</div>;
  }

  // ——— 4. 最终渲染：画布 + 子组件（评论 & 代码标注） ———
  console.log('PDFViewer pdfPath:', pdfPath);
  return (
    <div className="relative bg-gray-100 overflow-auto h-full">
      <PDFContext.Provider value={{ pageMetrics }}>
        {pageMetrics.map((m, i) => (
          <div
            key={i}
            className="mx-auto relative mb-6" // 增加下边距
            style={{ 
              width: m.width, 
              height: m.height,
              marginBottom: '20px',
              position: 'relative',
              zIndex: 1 // 设置基本z-index
            }}
          >
            <canvas
              ref={(el) => { if (el) canvasRefs.current[i] = el; }}
              className="block"
            />
            {/* 使用类型断言解决 TypeScript 错误 */}
            {React.Children.map(children, child => {
              if (!React.isValidElement(child)) return child;
              
              // 使用更安全的方式获取组件名称
              const childType = getComponentName(child.type);

              // 增加 PageBoundCodeBlocks 到可识别的组件列表
              if (["CodeAnnotation", "CommentOverlay", "CodeBlockOverlay", "PageBoundCodeBlocks"].includes(childType)) {
                // 使用类型断言告诉 TypeScript 这个组件接受 page 属性
                return React.cloneElement(child, { page: i + 1 } as WithPageProps);
              }
              return child;
            })}
          </div>
        ))}
      </PDFContext.Provider>
    </div>
  );
};

export const usePDFMetrics = () => {
  const ctx = useContext(PDFContext);
  if (!ctx) throw new Error("usePDFMetrics 必须在 <PDFViewer> 内使用");
  return ctx.pageMetrics;
};

function getComponentName(component: React.ComponentType<unknown> | string | undefined): string {
  if (typeof component === 'string') {
    return component;
  }
  
  if (component) {
    // 尝试获取displayName或name属性
    return component.displayName || component.name || 'Unknown';
  }
  
  return 'Unknown';
}

export default PDFViewer;
