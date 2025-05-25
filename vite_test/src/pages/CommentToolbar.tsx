import React, { useState, useCallback, useEffect } from 'react';
// import { usePDFMetrics } from './PDFViewer';

export type CommentMode = 'none' | 'text' | 'highlight' | 'underline';

// 简化 position 类型，统一使用坐标系统
interface CommentPosition {
  type: CommentMode;
  x1: number;
  y1: number;
  x2?: number;
  y2?: number;
  width?: number;
  height?: number;
  page: number;
}

interface CommentToolbarProps {
  onModeChange: (mode: CommentMode) => void;
  currentMode: CommentMode;
  onAddComment: (comment: {
    type: CommentMode;
    position: CommentPosition;
    content: string;
  }) => void;
}

const CommentToolbar: React.FC<CommentToolbarProps> = ({ onModeChange, currentMode, onAddComment }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [tempPosition, setTempPosition] = useState<CommentPosition | null>(null);
  const [commentContent, setCommentContent] = useState('');
//   const pageMetrics = usePDFMetrics();

  const handleToolClick = useCallback((mode: CommentMode) => {
    if (currentMode === mode) {
      onModeChange('none');
      setIsExpanded(false);
    } else {
      onModeChange(mode);
      setIsExpanded(false);
    }
    console.log("AddComment currentMode: ", currentMode);
  }, [currentMode, onModeChange]);

//   const handlePDFClick = useCallback((e: React.MouseEvent) => {
//     if (currentMode === 'none') return;

//     const rect = e.currentTarget.getBoundingClientRect();
//     const x = (e.clientX - rect.left) / rect.width;
//     const y = (e.clientY - rect.top) / rect.height;
//     const pageIndex = pageMetrics.findIndex(metric => 
//       e.clientY >= metric.offsetY && e.clientY <= metric.offsetY + metric.height
//     );

//     if (pageIndex === -1) return;

//     const basePosition: CommentPosition = {
//       type: currentMode,
//       x1: x,
//       y1: y,
//       page: pageIndex + 1
//     };

//     if (currentMode === 'text') {
//       setTempPosition(basePosition);
//       setShowCommentDialog(true);
//     } else if (currentMode === 'highlight') {
//       setTempPosition({
//         ...basePosition,
//         width: 0,
//         height: 0
//       });
//     } else if (currentMode === 'underline') {
//       setTempPosition({
//         ...basePosition,
//         x2: x,
//         y2: y
//       });
//     }
//   }, [currentMode, pageMetrics]);

//   const handleMouseUp = useCallback((e: React.MouseEvent) => {
//     if (currentMode === 'none' || !tempPosition) return;

//     const rect = e.currentTarget.getBoundingClientRect();
//     const x = (e.clientX - rect.left) / rect.width;
//     const y = (e.clientY - rect.top) / rect.height;

//     if (currentMode === 'highlight') {
//       setTempPosition({
//         ...tempPosition,
//         x1: Math.min(tempPosition.x1, x),
//         y1: Math.min(tempPosition.y1, y),
//         width: Math.abs(x - tempPosition.x1),
//         height: Math.abs(y - tempPosition.y1)
//       });
//       setShowCommentDialog(true);
//     } else if (currentMode === 'underline') {
//       setTempPosition({
//         ...tempPosition,
//         x2: x,
//         y2: y
//       });
//       setShowCommentDialog(true);
//     }
//   }, [currentMode, tempPosition]);

  const handleCommentSubmit = useCallback(() => {
    if (!tempPosition || !commentContent.trim()) return;

    onAddComment({
      type: currentMode,
      position: tempPosition,
      content: commentContent
    });

    setShowCommentDialog(false);
    setCommentContent('');
    setTempPosition(null);
    onModeChange('none');
  }, [currentMode, commentContent, onAddComment, onModeChange, tempPosition]);

  useEffect(() => {
    if (currentMode !== 'none') {
      window.alert('请在 PDF 页面中点击或拖动选择要添加注释的位置');
    }
  }, [currentMode]);

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <div className={`flex flex-col gap-2 transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'} mb-3`}>
          <button
            className={`p-2 rounded-full shadow-lg ${currentMode === 'text' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
            onClick={() => handleToolClick('text')}
            title="添加文本评论"
          >
            💬
          </button>
          <button
            className={`p-2 rounded-full shadow-lg ${currentMode === 'highlight' ? 'bg-yellow-500 text-white' : 'bg-white text-gray-700'}`}
            onClick={() => handleToolClick('highlight')}
            title="添加高亮"
          >
            🖌️
          </button>
          <button
            className={`p-2 rounded-full shadow-lg ${currentMode === 'underline' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
            onClick={() => handleToolClick('underline')}
            title="添加下划线"
          >
            📝
          </button>
        </div>
        <button
          className="p-3 rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '✕' : '✎'}
        </button>
      </div>

      {showCommentDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-semibold mb-4">添加评论</h3>
            <textarea
              className="w-full h-32 p-2 border rounded mb-4"
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="请输入评论内容..."
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                onClick={() => {
                  setShowCommentDialog(false);
                  setCommentContent('');
                  setTempPosition(null);
                  onModeChange('none');
                }}
              >
                取消
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={handleCommentSubmit}
              >
                提交
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CommentToolbar;
