// vite_test/src/pages/filePageComponents/QuizBlock.tsx
import { useState } from 'react';

interface Quiz {
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
}
interface QuizBlockProps { quizList: Quiz[]; }

export function QuizBlock({ quizList }: QuizBlockProps) {
  const [userAnswers, setUserAnswers] = useState<(string | undefined)[]>(
    Array(quizList.length).fill(undefined)
  );
  const [results, setResults] = useState<(boolean | null)[]>(
    Array(quizList.length).fill(null)
  );

  const onChange = (i: number, v: string) => {
    const a = [...userAnswers]; a[i] = v; setUserAnswers(a);
  };

  const onSubmit = () => {
    const res = quizList.map((q, i) => {
      const ua = userAnswers[i];
      if (!ua) return null;

      if (q.options) {
        const sel = ua.split('.')[0].trim().toLowerCase();
        const ans = q.answer.trim().toLowerCase();
        return sel === ans;
      }
      return ua.trim().toLowerCase() === q.answer.trim().toLowerCase();
    });
    setResults(res);
  };

  return (
    <div className="prose prose-lg text-gray-900 max-w-none">
      {quizList.map((q, i) => (
        <div key={i} className="mb-6 p-4 bg-white rounded-lg shadow">
          <div className="text-lg font-semibold mb-2">
            {i + 1}. {q.question}
          </div>
          {q.options ? (
            <div className="space-y-2">
              {q.options.map((opt, j) => (
                <label key={j} className="flex items-center text-base">
                  <input
                    type="radio"
                    name={`q${i}`}
                    value={opt}
                    checked={userAnswers[i] === opt}
                    onChange={() => onChange(i, opt)}
                    className="mr-2"
                  />
                  {opt}
                </label>
              ))}
            </div>
          ) : (
            <input
              type="text"
              className="border rounded p-2 mt-2 w-full"
              value={userAnswers[i] ?? ''}
              onChange={e => onChange(i, e.target.value)}
              placeholder="请输入答案"
            />
          )}
          {results[i] !== null && (
            <div className={`mt-2 ${results[i] ? 'text-green-600' : 'text-red-600'}`}>
              {results[i]
                ? `✅ 正确！解析：${q.explanation}`
                : `❌ 错误，正确答案是 ${q.answer}。解析：${q.explanation}`}
            </div>
          )}
        </div>
      ))}
      <button onClick={onSubmit} className="bg-blue-500 text-white px-4 py-2 rounded">
        提交答案
      </button>
    </div>
  );
}
