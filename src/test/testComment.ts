import * as vscode from 'vscode';
import { addComment, deleteCommentById, getAllComments } from '../commentService';

export function activate(context: vscode.ExtensionContext) {
  vscode.commands.registerCommand('commentTester.testAdd', async () => {
    const filePath = '/Users/alice/test.pdf'; // 改为本地文件路径
    await addComment({
      filePath,
      page_number: 1,
      position: 'top-left',
      content: '测试评论',
      type: 'text',
      author: 'Alice'
    });
    vscode.window.showInformationMessage('添加评论成功');
  });

  vscode.commands.registerCommand('commentTester.testFetch', async () => {
    const fileId = 'e527d09fb30843d963351b87d24d13a3e3f904ab95f20b7a2e0f81b602791a88';
    const comments = await getAllComments(fileId);
    console.log(comments);
    vscode.window.showInformationMessage(`获取了 ${comments.length} 条评论`);
  });

  vscode.commands.registerCommand('commentTester.testDelete', async () => {
    await deleteCommentById(1); // 替换为数据库中实际存在的评论 ID
    vscode.window.showInformationMessage('删除评论成功');
  });
}
