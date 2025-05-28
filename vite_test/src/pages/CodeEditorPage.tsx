import React, { useState, useEffect, useRef } from 'react';
import { getVsCodeApi } from '../vscodeApi';

export default function CodeEditorPage() {
  const vscode = getVsCodeApi();
  const [code, setCode] = useState('// 在此处输入您的代码\n');
  const [language, setLanguage] = useState('Python');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [availableEnvs, setAvailableEnvs] = useState<string[]>([]);
  const [selectedEnv, setSelectedEnv] = useState('');
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      if (message.command === 'runCodeResult') {
        setOutput(message.result);
        setIsRunning(false);
      } else if (message.command === 'availableEnvironments') {
        setAvailableEnvs(message.environments);
        if (message.environments.length > 0) {
          setSelectedEnv(message.environments[0]);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    // 请求可用的Python环境
    vscode?.postMessage({ command: 'getAvailableEnvironments' });
    
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleRunCode = () => {
    setIsRunning(true);
    setOutput('正在运行...');
    vscode?.postMessage({
      command: 'runCode',
      code,
      language,
      environment: selectedEnv
    });
  };

  const getLanguageTemplate = (lang: string) => {
    switch(lang) {
      case 'Python':
        return '# Python代码示例\n\ndef main():\n    print("Hello, World!")\n\nif __name__ == "__main__":\n    main()';
      case 'C':
        return '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}';
      case 'C++':
        return '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}';
      case 'Java':
        return 'public class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}';
      default:
        return '// 在此处输入您的代码\n';
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(getLanguageTemplate(newLang));
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">💻 代码编辑器</h1>
      
      <div className="flex mb-4 space-x-2">
        <select
          value={language}
          onChange={handleLanguageChange}
          className="border p-2 rounded"
        >
          <option value="Python">Python</option>
          <option value="C">C</option>
          <option value="C++">C++</option>
          <option value="Java">Java</option>
        </select>
        
        {language === 'Python' && (
          <select
            value={selectedEnv}
            onChange={(e) => setSelectedEnv(e.target.value)}
            className="border p-2 rounded"
          >
            {availableEnvs.length > 0 ? (
              availableEnvs.map(env => (
                <option key={env} value={env}>{env}</option>
              ))
            ) : (
              <option value="">默认环境</option>
            )}
          </select>
        )}
        
        <button
          onClick={handleRunCode}
          disabled={isRunning}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
        >
          {isRunning ? '运行中...' : '运行代码'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border rounded">
          <div className="bg-gray-100 p-2 border-b">代码</div>
          <textarea
            ref={editorRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-96 p-4 font-mono"
            spellCheck={false}
          />
        </div>
        
        <div className="border rounded">
          <div className="bg-gray-100 p-2 border-b">输出</div>
          <pre className="p-4 h-96 overflow-auto bg-black text-green-500 font-mono whitespace-pre-wrap">
            {output}
          </pre>
        </div>
      </div>
    </div>
  );
}