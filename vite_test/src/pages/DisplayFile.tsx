import React, { useState } from "react";
import PDFViewer from "./PDFViewer";
import CommentOverlay from "./CommentOverlay";
import CodeAnnotation from "./CodeAnnotation";
import { CommentData, CodeSnippetData } from "../types/annotations";

interface FilePageProps {
  filePath: string;
  comments: CommentData[];
  codeSnippets: CodeSnippetData[];
}

const FilePage: React.FC<FilePageProps> = ({ comments, codeSnippets }) => {
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  return (
    <div className="w-full h-full relative">
      <PDFViewer>
        <CommentOverlay data={comments} />
        <CodeAnnotation data={codeSnippets} />
      </PDFViewer>
      <button
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-3 py-1 rounded shadow-md text-sm hover:bg-blue-700"
        onClick={() => setAiPanelOpen(true)}
      >
        AI 助手
      </button>
      {aiPanelOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
          onClick={() => setAiPanelOpen(false)}
        >
          <div
            className="bg-white w-3/4 max-w-xl p-4 rounded shadow-lg relative"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-2">AI 生成助手</h2>
            <div className="mb-4">
              <h3 className="font-medium text-gray-700">课程总结</h3>
              <p className="text-sm text-gray-600 mb-2">点击下方按钮生成课程内容总结。</p>
              <button
                className="text-sm bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
                onClick={() => alert("课程总结生成中... (示例)")}
              >
                生成总结
              </button>
            </div>
            <div className="mb-4">
              <h3 className="font-medium text-gray-700">测试题生成</h3>
              <p className="text-sm text-gray-600 mb-2">点击下方按钮生成测试题。</p>
              <button
                className="text-sm bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
                onClick={() => alert("测试题生成中...（示例）")}
              >
                生成测试题
              </button>
            </div>
            <button
              className="absolute top-2 right-3 text-gray-500 hover:text-gray-800"
              onClick={() => setAiPanelOpen(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilePage;
