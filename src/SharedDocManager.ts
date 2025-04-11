// import * as vscode from 'vscode';

// export class SharedDocManager {
//   private outputChannel: vscode.OutputChannel;

//   constructor(private context: vscode.ExtensionContext) {
//     this.outputChannel = vscode.window.createOutputChannel("Shared Editor");
//   }

//   public init() {
//     this.outputChannel.appendLine("SharedDocManager initialized.");

//     // 监听本地编辑变更
//     this.context.subscriptions.push(
//       vscode.workspace.onDidChangeTextDocument(this.broadcastLocalChange.bind(this))
//     );

//     // 模拟远端连接成功
//     setTimeout(() => {
//       this.outputChannel.appendLine("Connected to mock server.");
//       vscode.window.showInformationMessage("Shared editing ready.");
//     }, 1000);
//   }

//   // 本地编辑 -> 模拟发送到远端
//   private broadcastLocalChange(event: vscode.TextDocumentChangeEvent) {
//     if (event.document.languageId !== 'markdown' && event.document.languageId !== 'plaintext') {
//       return; // 简化：只同步 markdown / plain 文本
//     }

//     const changes = event.contentChanges.map(c => c.text).join('');
//     this.outputChannel.appendLine(`Local change: ${changes}`);

//     // 模拟收到远端更新（2秒后）
//     setTimeout(() => {
//       this.handleRemoteChange(event.document.uri, `Remote updated content after "${changes}"`);
//     }, 2000);
//   }

//   // 模拟远端更改 -> 应用到当前文档
//   private async handleRemoteChange(uri: vscode.Uri, newContent: string) {
//     const activeEditor = vscode.window.activeTextEditor;
//     if (!activeEditor || activeEditor.document.uri.toString() !== uri.toString()) {
//       return; // 确保是正确的文档
//     }

//     const doc = activeEditor.document;
//     const edit = new vscode.WorkspaceEdit();

//     // 找到内容需要修改的位置
//     const range = new vscode.Range(
//       doc.positionAt(0), // 可以调整根据实际变更的起始位置
//       doc.positionAt(doc.getText().length)
//     );

//     edit.replace(doc.uri, range, newContent); // 只修改变化的部分
//     await vscode.workspace.applyEdit(edit);

//     this.outputChannel.appendLine(`Remote change applied to ${uri.toString()}.`);
//   }
// }


import * as vscode from 'vscode';

export class SharedDocManager {
  private liveShare: any;

  constructor(private context: vscode.ExtensionContext) {}

  public async init() {
    // 获取lives hare插件实例
    const extension = vscode.extensions.getExtension('ms-vsliveshare.vsliveshare');
    if (!extension) {
      vscode.window.showErrorMessage('Live Share 扩展未安装或无法加载');
      return;
    }

    // 激活插件，获取API
    const liveShareApi = await extension.activate();
    if (!liveShareApi) {
      vscode.window.showErrorMessage('无法激活 Live Share API');
      return;
    }

    this.liveShare = liveShareApi;

    // 监听会话变更
    this.liveShare.onDidChangeSession((e: any) => {
      if (e.session) {
        vscode.window.showInformationMessage(`Joined Live Share session as ${e.session.role}`);
      } else {
        vscode.window.showInformationMessage('Live Share session ended.');
      }
    });

    // 初始化监听本地文档修改的函数
    this.listenToFileChanges();

    // TODO: 让joiner也可以新建文件？怎么向某课程中添加文件？现在新建文件不能实时显示？

    // 接收其他人的广播信息
    this.liveShare.onReceiveBroadcast?.('documentChange', (payload: any) => {
      const { uri, content } = payload;
      const documentUri = vscode.Uri.parse(uri);
      this.applyRemoteChanges(content, documentUri);
    });
  }

  private listenToFileChanges() {
    if (!this.liveShare) {return;}

    const supportedLanguages = [
      'markdown', 
      'python', 
      'java', 
      'cpp', 
      'c', 
      'javascript', 
      'typescript'
    ];

    this.context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (supportedLanguages.includes(event.document.languageId)) {
          this.broadcastChange(event);
        }
      })
    );
  }

  private async broadcastChange(event: vscode.TextDocumentChangeEvent) {
    const changes = event.contentChanges.map((c) => c.text).join('');
    if (!this.liveShare) {return;}

    // 广播修改内容
    await this.liveShare.broadcast?.('documentChange', {
      uri: event.document.uri.toString(),
      content: changes,  
    });
  }

  public async applyRemoteChanges(newContent: string, documentUri: vscode.Uri) {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor || activeEditor.document.uri.toString() !== documentUri.toString()) {
      return;
    }

    const doc = activeEditor.document;
    const edit = new vscode.WorkspaceEdit();
    const range = new vscode.Range(0, 0, doc.lineCount, 0);

    edit.replace(doc.uri, range, newContent);
    await vscode.workspace.applyEdit(edit);
  }
}


// import * as vscode from 'vscode';
// import * as vsls from 'vsls';

// export class SharedDocManager {
//   private liveShare: vsls.LiveShare | undefined;

//   constructor(private context: vscode.ExtensionContext) {
//     this.liveShare = vscode.extensions.getExtension('ms-vsliveshare.vsliveshare')?.exports;
//   }

//   public init() {
//     if (!this.liveShare) {
//       vscode.window.showErrorMessage('Live Share is not available.');
//       return;
//     }

//     this.liveShare.onDidJoinSession((session) => {
//       vscode.window.showInformationMessage('Joined Live Share session!');
//     });

//     this.liveShare.onDidEndSession(() => {
//       vscode.window.showInformationMessage('Live Share session ended.');
//     });

//     // 创建共享会话
//     this.createLiveShareSession();
//   }

//   private async createLiveShareSession() {
//     if (!this.liveShare) {
//       return;
//     }

//     try {
//       // 创建新的 Live Share 会话
//       const session = await this.liveShare.createSession({
//         name: 'Shared Markdown Editing',
//         description: 'Collaborative editing session for markdown files.',
//       });
//       vscode.window.showInformationMessage(`Live Share session started: ${session.id}`);
//     } catch (error) {
//       vscode.window.showErrorMessage(`Failed to create session: ${error}`);
//     }
//   }

//   // 监听文件编辑
//   public listenToFileChanges() {
//     if (!this.liveShare) return;

//     this.context.subscriptions.push(
//       vscode.workspace.onDidChangeTextDocument((event) => {
//         // 监听到文件内容变化后，将变更广播到共享会话
//         if (event.document.languageId === 'markdown') {
//           this.broadcastChange(event);
//         }
//       })
//     );
//   }

//   private async broadcastChange(event: vscode.TextDocumentChangeEvent) {
//     const changes = event.contentChanges.map(c => c.text).join('');
//     if (!this.liveShare) return;
//     this.liveShare?.sendMessage({
//       type: 'documentChange',
//       documentUri: event.document.uri.toString(),
//       changes,
//     });
//   }

//   // 模拟远程同步
//   public applyRemoteChanges(newContent: string, documentUri: vscode.Uri) {
//     const activeEditor = vscode.window.activeTextEditor;
//     if (!activeEditor || activeEditor.document.uri.toString() !== documentUri.toString()) {
//       return; // 确保操作的是正确的文档
//     }

//     const doc = activeEditor.document;
//     const edit = new vscode.WorkspaceEdit();
//     const range = new vscode.Range(0, 0, doc.lineCount, 0); // 可调整根据实际变更的范围

//     edit.replace(doc.uri, range, newContent);
//     vscode.workspace.applyEdit(edit);
//   }
// }
