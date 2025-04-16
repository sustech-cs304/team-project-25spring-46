// vscodeApi.ts
let vscodeInstance: any = null;

export function getVsCodeApi() {
  if (!isInVSCodeWebView()){
    return null;
  }
  if (!vscodeInstance && (window as any).acquireVsCodeApi) {
    vscodeInstance = (window as any).acquireVsCodeApi();
  }
  return vscodeInstance;
}

function isInVSCodeWebView(): boolean {
    return (
      typeof (window as any).acquireVsCodeApi === 'function' ||
      typeof (window as any).acquireVsCodeApi === 'object'
    );
}