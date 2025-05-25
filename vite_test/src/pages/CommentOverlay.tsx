import React from 'react';
import { useSidePanel } from './SidePanelContext';
import { usePDFMetrics } from './PDFViewer';
import { CommentData } from '../types/annotations';

interface Props {
  data: CommentData[];
}

const CommentOverlay: React.FC<Props> = ({ data: comments }) => {
  const { openPanel } = useSidePanel();
  const pageMetrics = usePDFMetrics();

  const handleClick = (comment: CommentData) => {
    openPanel({
      id: comment.id,
      type: 'comment',
      content: comment.content,
      author: comment.author,
      time: comment.time,
    });
  };

  return (
    <>
      {comments.map(comment => {
        const metric = pageMetrics[comment.page - 1];
        if (!metric) return null;

        const pos = comment.position;
        if (!pos) return null;

        if (comment.type === 'text' && 'x' in pos && 'y' in pos) {
            const left = pos.x * metric.width;
            const top = metric.offsetY + pos.y * metric.height;
            return (
              <div
                key={comment.id}
                className="comment-icon absolute cursor-pointer"
                style={{ left, top }}
                onClick={() => handleClick(comment)}
                title="查看评论"
              >
                💬
              </div>
            );
        }

        if (comment.type === 'highlight' && 'x' in pos && 'y' in pos && 'width' in pos && 'height' in pos) {
            const left = pos.x * metric.width;
            const top = metric.offsetY + pos.y * metric.height;
            const boxWidth = pos.width * metric.width;
            const boxHeight = pos.height * metric.height;
            return (
              <div
                key={comment.id}
                className="absolute bg-yellow-300 opacity-40 pointer-events-none"
                style={{
                  left,
                  top,
                  width: boxWidth,
                  height: boxHeight,
                }}
                title="高亮"
              />
            );
          }

        if (comment.type === 'underline' && 'x1' in pos && 'y1' in pos && 'x2' in pos && 'y2' in pos) {
            const left = pos.x1 * metric.width;
            const top = metric.offsetY + pos.y1 * metric.height;
            const lineWidth = (pos.x2 - pos.x1) * metric.width;
            const lineHeight = 2; // 下划线高度
            return (
              <div
                key={comment.id}
                className="absolute bg-blue-500"
                style={{
                  left,
                  top,
                  width: lineWidth,
                  height: lineHeight,
                }}
                title="下划线"
              />
            );
        }

        return null;
      })}
    </>
  );
};

export default CommentOverlay;
