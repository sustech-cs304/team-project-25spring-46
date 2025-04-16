// vscodeApi.ts
let vscodeInstance = null;
export function getVsCodeApi() {
    if (!isInVSCodeWebView()) {
        return null;
    }
    if (!vscodeInstance && window.acquireVsCodeApi) {
        vscodeInstance = window.acquireVsCodeApi();
    }
    return vscodeInstance;
}
function isInVSCodeWebView() {
    return (typeof window.acquireVsCodeApi === 'function' ||
        typeof window.acquireVsCodeApi === 'object');
}
//# sourceMappingURL=vscodeApi.js.map