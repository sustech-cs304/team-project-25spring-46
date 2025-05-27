// vite_test/src/pages/filePageComponents/AIAssistant.tsx
import { useState, useEffect } from 'react';
import { getVsCodeApi } from '../../vscodeApi';
import { QuizBlock } from './QuizBlock';


interface Quiz {
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
}

interface AIAssistantProps {
  filePath: string;
}

export function AIAssistant({ filePath }: AIAssistantProps) {
  const vscode = getVsCodeApi();

  // 用来存放 AI 返回的结果（字符串或 Quiz 数组）
  const [aiResult, setAiResult] = useState<string | Quiz[] | null>(null);
  // 标记当前是 summary 还是 quiz
  const [aiResultType, setAiResultType] = useState<'summary' | 'quiz' | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!message.command) return;

      if (message.command === 'aiSummaryResult') {
        // 后端返回的 summary 文本
        setAiResultType('summary');
        setAiResult(message.content as string);
        setAiLoading(false);
      }

      if (message.command === 'aiQuizResult') {
        // 后端返回包含 quiz JSON 的字符串
        const raw = message.content as string;
        // 提取 JSON 数组部分并解析
        const quizzes: Quiz[] = JSON.parse(raw.match(/\[.*\]/s)?.[0] || '[]');
        setAiResultType('quiz');
        setAiResult(quizzes);
        setAiLoading(false);
      }

      if (message.command === 'saveSummaryResult') {
        // 处理 AI 错误
        setAiResultType('summary');
        if (message.success) {
            setAiResult(`✅ 已保存并打开：${message.mdPath}`);
        }
        else {
            setAiResult(`❌ 保存失败：${message.error}`);
        }
        setAiLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);


  const generateSummary = () => {
    if (!vscode) return;
    setAiLoading(true);
    setAiResult(null);
    setAiResultType(null);
    vscode.postMessage({ command: 'generateSummaryAndSave', filePath });
  };

  const generateQuiz = () => {
    if (!vscode) return;
    setAiLoading(true);
    setAiResult(null);
    setAiResultType(null);
    vscode.postMessage({ command: 'generateQuiz', filePath });
  };

  // 把后端的 "\n" 字符串还原成真正的换行
  const summaryText =
    aiResultType === 'summary' && typeof aiResult === 'string'
      ? aiResult.replace(/\\n/g, '\n')
      : '';

  return (
    <div className="bg-white shadow p-4 rounded-xl">
      <h2 className="text-xl font-semibold mb-4">🤖 AI 生成助手</h2>
      <div className="flex gap-4">
        <button
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
          onClick={generateSummary}
        >
          📘 生成课程总结
        </button>
        <button
          className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600"
          onClick={generateQuiz}
        >
          📝 生成测试题
        </button>
      </div>
      <div className="mt-4 bg-gray-100 rounded p-4 min-h-[6rem]">
        {aiLoading && <div>⏳ 正在生成...</div>}

        {!aiLoading && aiResultType === 'summary' && typeof aiResult === 'string' && (
            <div className="prose prose-lg text-gray-900 dark:prose-invert max-w-none">
            {summaryText}
            </div>
        )}

        {!aiLoading && aiResultType === 'quiz' && Array.isArray(aiResult) && (
          <QuizBlock quizList={aiResult} />
        )}
      </div>
    </div>
  );
}
