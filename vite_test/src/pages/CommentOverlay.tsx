import React from 'react';
import { useSidePanel } from './SidePanelContext';
import { CommentData } from '../types/annotations';
import { CommentPosition } from './CommentToolbar';
import { usePDFMetrics } from './PDFViewer';

interface Props {
  comments: CommentData[];
  previewPosition?: CommentPosition | null;
  page?: number;
}

const CommentOverlay: React.FC<Props> = ({ comments, previewPosition, page }) => {
  const { openPanel } = useSidePanel();
  const pageMetrics = usePDFMetrics();

  // 如果没有提供页码，记录错误并返回空
  if (!page) {
    console.error('CommentOverlay: page prop is required but not provided');
    return null;
  }

  console.log('CommentOverlay: start to render, page =', page);
  console.log('CommentOverlay: total comments =', comments.length);
  // console.log('CommentOverlay: pageMetrics =', pageMetrics);

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

  // 只渲染当前页面的评论
  const currentPageComments = comments.filter(comment => comment.page === page);
  const currentPagePreview = previewPosition && previewPosition.page === page ? previewPosition : null;

  // console.log('CommentOverlay: current page comments =', currentPageComments.length);
  // console.log('CommentOverlay: has preview =', !!currentPagePreview);

  return (
    <div style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0,
      pointerEvents: 'none' // 允许点击穿透到 PDF
    }}>
      {currentPageComments.map(comment => {
        const pos = comment.position;
        if (!pos) return null;

        // 计算评论在 PDF 中的绝对位置
        const pageMetric = pageMetrics?.[page - 1];
        if (!pageMetric) {
          console.error('CommentOverlay: pageMetric not found for page', page);
          return null;
        }

        // const absoluteTop = pageMetric.offsetY;
        // const absoluteLeft = pageMetric.offsetX;
        console.log('CommentOverlay: rendering comment on page', page, 'with position', pos);
        console.log('CommentOverlay: pageMetric', pageMetric);

        if (comment.type === 'text' && 'x' in pos && 'y' in pos) {
          return (
            <div
              key={comment.id}
              className="comment-icon absolute cursor-pointer"
              style={{
                position: 'absolute',
                left: pos.x * pageMetric.width,
                top: pos.y * pageMetric.height,//absoluteTop + pos.y * pageMetric.height,
                zIndex: 30,
                pointerEvents: 'auto' // 恢复点击事件
              }}
              onClick={() => handleClick(comment)}
              title={comment.content ? "查看评论" : "无评论内容"}
            >
              💬
            </div>
          );
        }

        if (comment.type === 'highlight' && 'x' in pos && 'y' in pos && 'width' in pos && 'height' in pos) {
          return (
            <div
              key={comment.id}
              className={`absolute bg-yellow-300 opacity-40 ${comment.content ? 'cursor-pointer hover:opacity-60' : 'pointer-events-none'}`}
              style={{
                position: 'absolute',
                left: pos.x * pageMetric.width,
                top: pos.y * pageMetric.height,
                width: pos.width * pageMetric.width,
                height: pos.height * pageMetric.height,
                zIndex: 30,
                pointerEvents: 'auto' // 恢复点击事件
              }}
              onClick={() => handleClick(comment)}
              title={comment.content ? "查看评论" : "无评论内容"}
            />
          );
        }

        if (comment.type === 'underline' && 'x1' in pos && 'y1' in pos && 'x2' in pos && 'y2' in pos) {
          const lineWidth = (pos.x2 - pos.x1) * pageMetric.width;
          return (
            <div
              key={comment.id}
              className={`absolute bg-blue-500 ${comment.content ? 'cursor-pointer hover:opacity-80' : 'pointer-events-none'}`}
              style={{
                position: 'absolute',
                left: pos.x1 * pageMetric.width,
                top: pos.y1 * pageMetric.height,
                width: lineWidth,
                height: '2px',
                zIndex: 30,
                pointerEvents: 'auto' // 恢复点击事件
              }}
              onClick={() => handleClick(comment)}
              title={comment.content ? "查看评论" : "无评论内容"}
            />
          );
        }

        return null;
      })}

      {currentPagePreview && (() => {
        const pageMetric = pageMetrics?.[page - 1];
        if (!pageMetric) {
          console.error('CommentOverlay: pageMetric not found for preview on page', page);
          return null;
        }

        // const absoluteTop = pageMetric.offsetY;
        // const absoluteLeft = pageMetric.offsetX;
        console.log('CommentOverlay: rendering preview on page', page, 'with position', currentPagePreview);
        console.log('CommentOverlay: pageMetric for preview', pageMetric);

        if (currentPagePreview.type === 'highlight' && 'x1' in currentPagePreview && 'y1' in currentPagePreview && 'width' in currentPagePreview && 'height' in currentPagePreview) {
          return (
            <div
              className="absolute bg-yellow-300 opacity-20 pointer-events-none"
              style={{
                position: 'absolute',
                left: currentPagePreview.x1 * pageMetric.width,
                top: currentPagePreview.y1 * pageMetric.height,
                width: currentPagePreview.width! * pageMetric.width,
                height: currentPagePreview.height! * pageMetric.height,
                zIndex: 30
              }}
            />
          );
        }

        if (currentPagePreview.type === 'underline' && 'x1' in currentPagePreview && 'y1' in currentPagePreview && 'x2' in currentPagePreview && 'y2' in currentPagePreview) {
          const width = (currentPagePreview.x2! - currentPagePreview.x1!) * pageMetric.width;
          return (
            <div
              className="absolute bg-blue-500 opacity-40 pointer-events-none"
              style={{
                position: 'absolute',
                left: currentPagePreview.x1 * pageMetric.width,
                top: currentPagePreview.y1 * pageMetric.height,
                width: width,
                height: '2px',
                zIndex: 30
              }}
            />
          );
        }

        return null;
      })()}
    </div>
  );
};

CommentOverlay.displayName = 'CommentOverlay';

export default CommentOverlay;
