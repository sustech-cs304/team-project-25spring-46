import React from 'react';
import { useSidePanel } from './SidePanelContext';
import { usePDFMetrics } from './PDFViewer';
import { CommentData } from '../types/annotations';
import { CommentPosition } from './DisplayPage';

interface Props {
  data: CommentData[];
  onPDFClick?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  previewPosition?: CommentPosition | null;
}

const CommentOverlay: React.FC<Props> = ({ data: comments, onPDFClick, onMouseMove, previewPosition }) => {
  const { openPanel } = useSidePanel();
  const pageMetrics = usePDFMetrics();

  const handleClick = (comment: CommentData) => {
    if (!comment.content) return;
    
    openPanel({
      id: comment.id,
      type: 'comment',
      content: comment.content,
      author: comment.author,
      time: comment.time,
    });
  };

  return (
    <div 
      className="absolute inset-0" 
      onClick={onPDFClick}
      onMouseMove={onMouseMove}
    >
      {comments.map(comment => {
        const metric = pageMetrics[comment.page - 1];
        if (!metric) return null;

        const pos = comment.position;
        if (!pos) return null;

        if (comment.type === 'text' && 'x' in pos && 'y' in pos) {
            const left = metric.offsetX + pos.x * metric.width;
            const top = metric.offsetY + pos.y * metric.height;
            return (
              <div
                key={comment.id}
                className="comment-icon absolute cursor-pointer"
                style={{ left, top }}
                onClick={() => handleClick(comment)}
                title={comment.content ? "查看评论" : "无评论内容"}
              >
                💬
              </div>
            );
        }

        if (comment.type === 'highlight' && 'x' in pos && 'y' in pos && 'width' in pos && 'height' in pos) {
            const left = metric.offsetX + pos.x * metric.width;
            const top = metric.offsetY + pos.y * metric.height;
            const boxWidth = pos.width * metric.width;
            const boxHeight = pos.height * metric.height;
            return (
              <div
                key={comment.id}
                className={`absolute bg-yellow-300 opacity-40 ${comment.content ? 'cursor-pointer hover:opacity-60' : 'pointer-events-none'}`}
                style={{
                  left,
                  top,
                  width: boxWidth,
                  height: boxHeight,
                }}
                onClick={() => handleClick(comment)}
                title={comment.content ? "查看评论" : "无评论内容"}
              />
            );
        }

        if (comment.type === 'underline' && 'x1' in pos && 'y1' in pos && 'x2' in pos && 'y2' in pos) {
            const left = metric.offsetX + pos.x1 * metric.width;
            const top = metric.offsetY + pos.y1 * metric.height;
            const lineWidth = (pos.x2 - pos.x1) * metric.width;
            const lineHeight = 2; // 下划线高度
            return (
              <div
                key={comment.id}
                className={`absolute bg-blue-500 ${comment.content ? 'cursor-pointer hover:opacity-80' : 'pointer-events-none'}`}
                style={{
                  left,
                  top,
                  width: lineWidth,
                  height: lineHeight,
                }}
                onClick={() => handleClick(comment)}
                title={comment.content ? "查看评论" : "无评论内容"}
              />
            );
        }

        return null;
      })}

      {previewPosition && (() => {
        const metric = pageMetrics[previewPosition.page - 1];
        if (!metric) return null;

        if (previewPosition.type === 'highlight' && 'x1' in previewPosition && 'y1' in previewPosition && 'width' in previewPosition && 'height' in previewPosition) {
          const left = metric.offsetX + previewPosition.x1 * metric.width;
          const top = metric.offsetY + previewPosition.y1 * metric.height;
          const width = previewPosition.width! * metric.width;
          const height = previewPosition.height! * metric.height;
          return (
            <div
              className="absolute bg-yellow-300 opacity-20 pointer-events-none"
              style={{ left, top, width, height }}
            />
          );
        }

        if (previewPosition.type === 'underline' && 'x1' in previewPosition && 'y1' in previewPosition && 'x2' in previewPosition && 'y2' in previewPosition) {
          const left = metric.offsetX + previewPosition.x1 * metric.width;
          const top = metric.offsetY + previewPosition.y1 * metric.height;
          const width = (previewPosition.x2! - previewPosition.x1!) * metric.width;
          return (
            <div
              className="absolute bg-blue-500 opacity-40 pointer-events-none"
              style={{ left, top, width, height: 2 }}
            />
          );
        }

        return null;
      })()}
    </div>
  );
};

export default CommentOverlay;