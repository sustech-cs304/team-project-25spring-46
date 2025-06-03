// CommentToolbar.tsx
import React, { useState, useCallback, useEffect } from 'react';

export type CommentMode = 'none' | 'text' | 'highlight' | 'underline';

// 简化 position 类型，统一使用坐标系统
export interface CommentPosition {
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

  // ✅ 新增传入属性
  showDialog: boolean;
  pendingPosition: CommentPosition | null;
  onCancelDialog: () => void;
}

const CommentToolbar: React.FC<CommentToolbarProps> = ({ onModeChange, currentMode, onAddComment, showDialog, pendingPosition, onCancelDialog }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  // const [showCommentDialog, setShowCommentDialog] = useState(false);
  // const [tempPosition, setTempPosition] = useState<CommentPosition | null>(null);
  const [commentContent, setCommentContent] = useState('');

  const handleToolClick = useCallback((mode: CommentMode) => {
    const newMode = currentMode === mode ? 'none' : mode;
    onModeChange(newMode);
    setIsExpanded(false);
    console.log("Selected Add Comment Mode: ", newMode);
  }, [currentMode, onModeChange]);

  const handleCommentSubmit = useCallback(() => {
    if (!pendingPosition || !commentContent.trim()) return;

    onAddComment({
      type: currentMode,
      position: pendingPosition,
      content: commentContent
    });

    setCommentContent('');
    onCancelDialog();
    onModeChange('none');
  }, [currentMode, commentContent, onAddComment, onCancelDialog, onModeChange, pendingPosition]);

  useEffect(() => {
    if (currentMode !== 'none') {
      const message = {
        'text': '请点击 PDF 页面选择要添加文本评论的位置',
        'highlight': '请在 PDF 页面上拖动鼠标选择要高亮的区域',
        'underline': '请在 PDF 页面上拖动鼠标选择要添加下划线的文本'
      }[currentMode];
      
      window.alert(message);
      console.log(message);
    }
  }, [currentMode]);

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[1000]">
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

      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1001]">
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
                  setCommentContent('');
                  onCancelDialog();
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
