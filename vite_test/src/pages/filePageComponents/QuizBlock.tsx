import { useState } from 'react';

interface Quiz {
    question: string;
    options?: string[];
    answer: string;
    explanation: string;
}

interface QuizBlockProps {
    quizList: Quiz[];
}

export function QuizBlock({ quizList }: QuizBlockProps) {
    const [userAnswers, setUserAnswers] = useState<(string | undefined)[]>(
        Array(quizList.length).fill(undefined)
    );
    const [results, setResults] = useState<(boolean | null)[]>(
        Array(quizList.length).fill(null)
    );

    const handleChange = (idx: number, value: string) => {
        const arr = [...userAnswers];
        arr[idx] = value;
        setUserAnswers(arr);
    };

    const handleSubmit = () => {
        const res = quizList.map((q, idx) => {
            if (!userAnswers[idx]) return null;
            return userAnswers[idx]?.trim().toLowerCase() === q.answer.trim().toLowerCase();
        });
        setResults(res);
    };

    return (
        <div>
            {quizList.map((q, idx) => (
                <div key={idx} className="mb-6 p-4 bg-gray-50 rounded">
                    <div className="font-bold mb-2">
                        {idx + 1}. {q.question}
                    </div>
                    {q.options ? (
                        <div>
                            {q.options.map((opt, i) => (
                                <label key={i} className="block">
                                    <input
                                        type="radio"
                                        name={`quiz_${idx}`}
                                        value={opt}
                                        checked={userAnswers[idx] === opt}
                                        onChange={() => handleChange(idx, opt)}
                                    />{" "}
                                    {opt}
                                </label>
                            ))}
                        </div>
                    ) : (
                        <input
                            type="text"
                            className="border rounded p-1 mt-2"
                            value={userAnswers[idx] || ""}
                            onChange={(e) => handleChange(idx, e.target.value)}
                            placeholder="请输入答案"
                        />
                    )}
                    {results[idx] !== null && (
                        <div
                            className={`mt-2 ${
                                results[idx] ? "text-green-600" : "text-red-600"
                            }`}
                        >
                            {results[idx]
                                ? `✅ 正确！解析：${q.explanation}`
                                : `❌ 错误，正确答案是：${q.answer}。解析：${q.explanation}`}
                        </div>
                    )}
                </div>
            ))}
            <button
                className="bg-blue-500 text-white px-4 py-2 rounded"
                onClick={handleSubmit}
            >
                提交答案
            </button>
        </div>
    );
} 