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
        const left = comment.position.x * metric.width;
        const top = metric.offsetY + comment.position.y * metric.height;

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
      })}
    </>
  );
};

export default CommentOverlay;
