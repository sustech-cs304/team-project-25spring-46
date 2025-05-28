// vscodeApi.ts
// 确保只获取一次API实例
let vscodeApiInstance: any = null;

export function getVsCodeApi() {
  if (!isInVSCodeWebView()){
    return null;
  }
  if (vscodeApiInstance === null) {
    try {
      // @ts-ignore
      vscodeApiInstance = acquireVsCodeApi();
      console.log("成功获取VSCode API实例");
    } catch (err) {
      console.error('获取VSCode API失败', err);
      return null;
    }
  }
  return vscodeApiInstance;
}

function isInVSCodeWebView(): boolean {
    return (
      typeof (window as any).acquireVsCodeApi === 'function' ||
      typeof (window as any).acquireVsCodeApi === 'object'
    );
}