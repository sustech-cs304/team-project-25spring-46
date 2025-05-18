import * as vscode from 'vscode';
import { CommentData, parsePosition, addComment, deleteCommentById, getAllComments } from '../commentService';

export function activate(context: vscode.ExtensionContext) {
  vscode.commands.registerCommand('commentTester.testAdd', async () => {
    const filePath = '/Users/alice/test.pdf'; // 改为本地文件路径
    await addComment({
      filePath,
      page: 1,
      // position: JSON.stringify({ x: 0.3, y: 0.5 }), // 不要手写转义
      x1: 0.3,
      y1: 0.5,
      content: '测试评论1',
      type: 'text',
      author: 'Alice'
    });
    await addComment({
      filePath,
      page: 2,
      x1: 0.7,
      y1: 0.8,
      x2: 1.7,
      y2: 0.8,
      type: 'underline',
      author: 'Bob'
    });
    await addComment({
      filePath,
      page: 2,
      x1: 0.6,
      y1: 0.7,
      height: 1,
      width: 2,
      type: 'highlight',
      author: 'Cindy'
    });
    vscode.window.showInformationMessage('添加评论成功');
  });

  vscode.commands.registerCommand('commentTester.testFetch', async () => {
    const fileId = 'e527d09fb30843d963351b87d24d13a3e3f904ab95f20b7a2e0f81b602791a88';
    const comments = await getAllComments('/Users/alice/test.pdf');
    vscode.window.showInformationMessage(`获取了 ${comments.length} 条评论`);
    console.log('Formatted CommentData:', JSON.stringify(comments, null, 2));
  });

  vscode.commands.registerCommand('commentTester.testDelete', async () => {
    await deleteCommentById(1); // 替换为数据库中实际存在的评论 ID
    vscode.window.showInformationMessage('删除评论成功');
  });
}
