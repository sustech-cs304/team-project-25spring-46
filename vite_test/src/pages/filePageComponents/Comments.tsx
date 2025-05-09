import { useState } from 'react';

interface Comment {
    user: string;
    time: string;
    content: string;
    page: string;
    location: string;
}

interface CommentsProps {
    selectedFile: string;
}

export function Comments({ selectedFile }: CommentsProps) {
    const [likes, setLikes] = useState<{ [key: number]: number }>({});
    const [replies, setReplies] = useState<{ [key: number]: string[] }>({});
    const [replyInput, setReplyInput] = useState<{ [key: number]: string }>({});

    const comments: Comment[] = [
        {
            user: "Alice",
            time: "2025-04-11 14:22",
            content: "这个文件讲得很清楚👍",
            page: "Lecture1.pdf",
            location: "第3页"
        },
        {
            user: "Bob",
            time: "2025-04-11 16:05",
            content: "有个地方我没看懂，第三页第二段。",
            page: "Lecture1.pdf",
            location: "第3页"
        },
        {
            user: "Cathy",
            time: "2025-04-10 10:30",
            content: "建议补充一个例题会更好。",
            page: "Lecture2.pdf",
            location: "第5页"
        },
    ];

    const handleLike = (idx: number) => {
        setLikes((prev) => ({ ...prev, [idx]: (prev[idx] || 0) + 1 }));
    };

    const handleReplySubmit = (idx: number) => {
        const reply = replyInput[idx];
        if (reply && reply.trim()) {
            setReplies((prev) => ({
                ...prev,
                [idx]: [...(prev[idx] || []), reply.trim()],
            }));
            setReplyInput((prev) => ({ ...prev, [idx]: "" }));
        }
    };

    return (
        <div className="bg-white shadow p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4">💬 交流评论</h2>
            <div className="space-y-6">
                {comments
                    .filter((c) => c.page === selectedFile)
                    .map((c, idx) => (
                        <div key={idx} className="border-b pb-4">
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>{c.user} · {c.location}</span>
                                <span>{c.time}</span>
                            </div>
                            <p className="mt-1 text-gray-800">{c.content}</p>
                            <div className="flex items-center gap-4 mt-2">
                                <button
                                    onClick={() => handleLike(idx)}
                                    className="text-sm text-blue-500 hover:underline"
                                >
                                    👍 点赞 ({likes[idx] || 0})
                                </button>
                            </div>
                            <div className="mt-2">
                                <input
                                    type="text"
                                    value={replyInput[idx] || ""}
                                    onChange={(e) =>
                                        setReplyInput((prev) => ({
                                            ...prev,
                                            [idx]: e.target.value,
                                        }))
                                    }
                                    placeholder="写下你的回复..."
                                    className="w-full border rounded p-2 text-sm"
                                />
                                <button
                                    onClick={() => handleReplySubmit(idx)}
                                    className="mt-1 text-sm text-green-600 hover:underline"
                                >
                                    ↩️ 回复
                                </button>
                            </div>
                            {replies[idx] && replies[idx].length > 0 && (
                                <ul className="mt-2 pl-4 list-disc text-sm text-gray-700 space-y-1">
                                    {replies[idx].map((reply, ridx) => (
                                        <li key={ridx}>{reply}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                {comments.filter((c) => c.page === selectedFile).length === 0 && (
                    <p className="text-gray-500">暂无评论</p>
                )}
            </div>
        </div>
    );
} 