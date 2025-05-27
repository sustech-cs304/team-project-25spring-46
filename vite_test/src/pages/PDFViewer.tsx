// src/pages/PDFViewer.tsx
import React, { useState, useEffect, useRef, createContext, useContext } from "react";
import * as pdfjs from "pdfjs-dist";
import { PDFDocumentProxy } from "pdfjs-dist";
import { getVsCodeApi } from "../vscodeApi";

type PageMetrics = {
  width: number;
  height: number;
  offsetY: number;
  offsetX: number; // 新增字段
};

interface PDFContextValue {
  pageMetrics: PageMetrics[];
}

const PDFContext = createContext<PDFContextValue | null>(null);

interface PDFViewerProps {
  filePath: string;
  children?: React.ReactNode;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ filePath, children }) => {
  const [workerPath, setWorkerPath] = useState<string | null>(null);
  const [pdfPath, setPdfPath] = useState<string>('');
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageMetrics, setPageMetrics] = useState<PageMetrics[]>([]);
  const canvasRefs = useRef<HTMLCanvasElement[]>([]);
  const outerContainerRef = useRef<HTMLDivElement>(null);
  const offsetCalculatedRef = useRef(false);
  const vscode = getVsCodeApi();

  // ——— 1. 请求并接收 Worker 路径 ———
  useEffect(() => {
    console.log("Now Loading PDFViewer: filePath:", filePath);
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.command === "PdfWorkerPath") {
        setWorkerPath(msg.path);
      }
      if (msg.command === "PdfPath") {
        setPdfPath(msg.path);
      }
    };
    window.addEventListener("message", handleMessage);
    vscode?.postMessage({ command: "getPdfWorkerPath" });
    vscode?.postMessage({ command: "getPdfPath", path: filePath });
    console.log("finish getPdfPath in PDFViewer")
    return () => window.removeEventListener("message", handleMessage);
  }, [vscode, filePath]);

  // ——— 2. 拿到 workerPath 后，加载 PDF ———
  useEffect(() => {
    console.log("Now pdf path:", pdfPath, "worker path:", workerPath);
    if (!pdfPath || !workerPath) return;
    pdfjs.GlobalWorkerOptions.workerSrc = workerPath;

    let cancelled = false;
    (async () => {
      try {
        const loadingTask = pdfjs.getDocument({
          url: pdfPath,
          disableRange: true,
        });
        const pdf = await loadingTask.promise;
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
            offsetY: cumulativeOffset,
            offsetX: 0, // 初始化 offsetX
          });
          cumulativeOffset += viewport.height + 10;
        }

        if (!cancelled) {
          setPageMetrics(metrics);
          offsetCalculatedRef.current = false; // 新设置pageMetrics，重置标记，等待计算offsetX
        }
      } catch (err) {
        console.error("PDF 加载失败:", err);
      }
    })();

    return () => { cancelled = true; };
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

  // ———— add：监听窗口resize ————
  useEffect(() => {
    const updateOffsets = () => {
      if (!outerContainerRef.current) return;
  
      const containerRect = outerContainerRef.current.getBoundingClientRect();
  
      setPageMetrics((prev) => {
        return prev.map((m, i) => {
          const canvas = canvasRefs.current[i];
          if (!canvas) return m;
  
          const canvasRect = canvas.getBoundingClientRect();
          const offsetX = canvasRect.left - containerRect.left;
  
          console.log(`Page ${i + 1} offsetX relative to outer container:`, offsetX);
  
          return {
            ...m,
            offsetX,
          };
        });
      });
    };
  
    window.addEventListener("resize", updateOffsets);
    // 页面加载时也触发一次，确保数据准确
    updateOffsets();
  
    return () => window.removeEventListener("resize", updateOffsets);
  }, []);  // 避免死循环

  // pageMetrics 更新时执行一次offsetX计算，避免死循环
  useEffect(() => {
    if (pageMetrics.length === 0) return;
    if (offsetCalculatedRef.current) return; // 已计算过则跳过

    offsetCalculatedRef.current = true; // 标记已计算

    // 延迟到下一帧，确保DOM布局完成
    requestAnimationFrame(() => {
      if (!outerContainerRef.current) return;
      const containerRect = outerContainerRef.current.getBoundingClientRect();

      const newMetrics = pageMetrics.map((m, i) => {
        const canvas = canvasRefs.current[i];
        if (!canvas) return m;

        const canvasRect = canvas.getBoundingClientRect();
        const offsetX = canvasRect.left - containerRect.left;
        console.log(`Page ${i + 1} offsetX recalculated in useEffect:`, offsetX);

        return { ...m, offsetX };
      });

      setPageMetrics(newMetrics);
    });
  }, [pageMetrics]);

  if (pageMetrics.length === 0) {
    return <div className="text-center text-gray-500">Loading PDF…</div>;
  }

  // ——— 4. 最终渲染：画布 + 子组件（评论 & 代码标注） ———
  return (
    <div 
      ref={outerContainerRef}
      className="relative bg-gray-100 overflow-auto h-full"
    >
      <div className="relative z-0">
        {pageMetrics.map((m, i) => (
          <div
            key={i}
            className="mx-auto relative mb-2"
            style={{ width: m.width, height: m.height }}
          >
            <canvas
              ref={(el) => { if (el) canvasRefs.current[i] = el; }}
              className="block"
            />
          </div>
        ))}
      </div>

      {/* 💡 CommentOverlay 放在一个独立图层中 */}
      <div className="absolute top-0 left-0 w-full h-full z-10">
        <PDFContext.Provider value={{ pageMetrics }}>
          {children}
        </PDFContext.Provider>
      </div>
    </div>
  );
};

export const usePDFMetrics = () => {
  const ctx = useContext(PDFContext);
  if (!ctx) throw new Error("usePDFMetrics 必须在 <PDFViewer> 内使用");
  return ctx.pageMetrics;
};

export default PDFViewer;
