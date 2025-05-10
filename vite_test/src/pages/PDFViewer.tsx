import React, { useState, useEffect, useRef, createContext, useContext } from "react";
import * as pdfjs from "pdfjs-dist";
import { GlobalWorkerOptions, PDFDocumentProxy } from "pdfjs-dist";
GlobalWorkerOptions.workerSrc = "/dist/assets/pdf.worker.min.js";

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
  pdfUrl: string;
  children?: React.ReactNode;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfUrl, children }) => {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageMetrics, setPageMetrics] = useState<PageMetrics[]>([]);
  const canvasRefs = useRef<HTMLCanvasElement[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        console.log("Attempting to load PDF:", pdfUrl);
        const loadingTask = pdfjs.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        setPdfDoc(pdf);

        const metrics: PageMetrics[] = [];
        let cumulativeOffset = 0;
        const scale = 1.0;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale });
          metrics.push({ width: viewport.width, height: viewport.height, offsetY: cumulativeOffset });
          cumulativeOffset += viewport.height + 10;
        }
        if (!cancelled) setPageMetrics(metrics);
      } catch (err: any) {
        console.error("PDF 加载失败:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [pdfUrl]);

  useEffect(() => {
    if (!pdfDoc || pageMetrics.length === 0) return;
    const scale = 1.0;
    pageMetrics.forEach((_, index) => {
      const canvas = canvasRefs.current[index];
      if (!canvas) return;
      pdfDoc.getPage(index + 1).then((page: pdfjs.PDFPageProxy) => {
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        if (context) {
          page.render({ canvasContext: context, viewport });
        }
      }).catch((err: any) => {
        console.error("Page 渲染失败:", err);
      });
    });
  }, [pdfDoc, pageMetrics]);

  if (pageMetrics.length === 0) {
    return <div className="text-center text-gray-500">Loading PDF...</div>;
  }

  return (
    <div className="relative bg-gray-100 overflow-auto h-full">
      {pageMetrics.map((metric, index) => (
        <div key={index} className="mx-auto relative mb-2" style={{ width: metric.width, height: metric.height }}>
          <canvas ref={el => { if (el) canvasRefs.current[index] = el; }} className="block" />
        </div>
      ))}
      <PDFContext.Provider value={{ pageMetrics }}>
        {children}
      </PDFContext.Provider>
    </div>
  );
};

export const usePDFMetrics = () => {
  const context = useContext(PDFContext);
  if (!context) throw new Error("usePDFMetrics must be used within PDFViewer");
  return context.pageMetrics;
};

export default PDFViewer;