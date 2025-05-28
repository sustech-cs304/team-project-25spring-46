// import React from 'react';
import MonacoEditor from 'react-monaco-editor';

export function CodeEditorModal({ code, language, onClose }: { code: string, language: string, onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', top: 60, right: 60, zIndex: 2000,
      background: '#fff', border: '1px solid #ccc', borderRadius: 8, boxShadow: '0 2px 16px rgba(0,0,0,0.2)'
    }}>
      <div style={{ padding: 8, borderBottom: '1px solid #eee', fontWeight: 'bold' }}>
        代码编辑器（{language}）
        <button onClick={onClose} style={{ float: 'right' }}>关闭</button>
      </div>
      <MonacoEditor
        height="400px"
        language={language.toLowerCase()}
        value={code}
        options={{
          readOnly: false,
          minimap: { enabled: false },
          lineNumbers: 'on',
        }}
      />
    </div>
  );
}
