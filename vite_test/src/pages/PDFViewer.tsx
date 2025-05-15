// src/pages/PDFViewer.tsx
import React, {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
} from "react";
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
  // 这个 prop 已经不需要了，因为我们从消息里拿 filePath
  // pdfUrl: string;
  children?: React.ReactNode;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ children }) => {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [workerPath, setWorkerPath] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageMetrics, setPageMetrics] = useState<PageMetrics[]>([]);
  const canvasRefs = useRef<HTMLCanvasElement[]>([]);
  const vscode = getVsCodeApi();

  // ——— 1. 请求并接收 PDF 与 Worker 路径 ———
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.command === "demoPdfPath") {
        setFilePath(msg.filePath);
      }
      if (msg.command === "PdfWorkerPath") {
        setWorkerPath(msg.path);
      }
    };
    window.addEventListener("message", handleMessage);
    vscode.postMessage({ command: "getDemoPdfPath" });
    vscode.postMessage({ command: "getPdfWorkerPath" });
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // ——— 2. 拿到两条路径后，设置 worker 并加载 PDF ———
  useEffect(() => {
    if (!filePath || !workerPath) return;
    pdfjs.GlobalWorkerOptions.workerSrc = workerPath;

    let cancelled = false;
    (async () => {
      try {
        const loadingTask = pdfjs.getDocument(filePath);
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        setPdfDoc(pdf);
    
        // 正确计算每页的宽高和 offsetY
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
  }, [filePath, workerPath]);

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

  if (pageMetrics.length === 0) {
    return <div className="text-center text-gray-500">Loading PDF…</div>;
  }

  // ——— 4. 最终渲染：画布 + 子组件（评论 & 代码标注） ———
  return (
    <div className="relative bg-gray-100 overflow-auto h-full">
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
      <PDFContext.Provider value={{ pageMetrics }}>
        {children}
      </PDFContext.Provider>
    </div>
  );
};

export const usePDFMetrics = () => {
  const ctx = useContext(PDFContext);
  if (!ctx) throw new Error("usePDFMetrics 必须在 <PDFViewer> 内使用");
  return ctx.pageMetrics;
};

export default PDFViewer;