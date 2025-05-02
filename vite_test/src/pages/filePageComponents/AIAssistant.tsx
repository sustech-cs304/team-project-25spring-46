import { useState } from 'react';
import { getVsCodeApi } from '../../vscodeApi';
import ReactMarkdown from 'react-markdown';
import { QuizBlock } from './QuizBlock.tsx';

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
    // const [aiResult, setAiResult] = useState<string | Quiz[] | null>(null);
    const [aiResult] = useState<string | Quiz[] | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    // const [aiResultType, setAiResultType] = useState<'summary' | 'quiz' | null>(null);
    const [aiResultType] = useState<'summary' | 'quiz' | null>(null);


    const generateSummary = () => {
        if (vscode) {
            setAiLoading(true);
            vscode.postMessage({ command: 'generateSummary', filePath });
        }
    };

    const generateQuiz = () => {
        if (vscode) {
            setAiLoading(true);
            vscode.postMessage({ command: 'generateQuiz', filePath });
        }
    };

    const cleanMd = aiResult ? (typeof aiResult === 'string' ? aiResult.replace(/\\n/g, '\n') : '') : '';

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
            <div className="mt-4 bg-gray-100 rounded p-4">
                {aiLoading ? (
                    "⏳ 正在生成..."
                ) : aiResult ? (
                    aiResultType === 'summary' && typeof aiResult === 'string' ? (
                        <div className="prose max-w-none">
                            <ReactMarkdown>{cleanMd}</ReactMarkdown>
                        </div>
                    ) : aiResultType === 'quiz' && Array.isArray(aiResult) ? (
                        <QuizBlock quizList={aiResult} />
                    ) : null
                ) : null}
            </div>
        </div>
    );
} 