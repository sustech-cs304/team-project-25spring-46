// pages/FilePage.tsx
import { useState, useEffect } from "react";
import { getVsCodeApi } from '../vscodeApi';

interface FileDetails {
  size: string;
  type: string;
  uploadedAt: string;
  subfolder: string;
}

interface CodeFile {
  path: string;
  content: string;
}

export default function FilePage({ filePath }: { filePath: string }) {
  console.log("Now loading FilePath:", filePath);
  const vscode = getVsCodeApi();
  const files = ["Lecture1.pdf", "Lecture2.pdf", "Lecture3.pdf"];
  const [selectedFile, setSelectedFile] = useState(files[0]);
  if(vscode == null) {
  const [showCode, setShowCode] = useState(false);
  const [likes, setLikes] = useState<{ [key: number]: number }>({});
  const [replies, setReplies] = useState<{ [key: number]: string[] }>({});
  const [replyInput, setReplyInput] = useState<{ [key: number]: string }>({});

  const comments = [
    { user: "Alice", time: "2025-04-11 14:22", content: "这个文件讲得很清楚👍", page: "Lecture1.pdf", location: "第3页" },
    { user: "Bob", time: "2025-04-11 16:05", content: "有个地方我没看懂，第三页第二段。", page: "Lecture1.pdf", location: "第3页" },
    { user: "Cathy", time: "2025-04-10 10:30", content: "建议补充一个例题会更好。", page: "Lecture2.pdf", location: "第5页" },
  ];

  const resources = [
    { title: "算法笔记分享", link: "https://example.com/note" },
    { title: "课后习题答案", link: "https://example.com/answer" },
    { title: "推荐阅读资料", link: "https://example.com/resource" },
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
    <div className="max-w-3xl mx-auto space-y-10">
      <h1 className="text-3xl font-bold text-center mt-6">📄 文件详情</h1>

      {/* 文件名选择器 */}
      <div className="flex flex-col items-center">
        <label className="mb-2 font-medium">当前文件：</label>
        <select
          value={selectedFile}
          onChange={(e) => setSelectedFile(e.target.value)}
          className="border p-2 rounded-md w-full max-w-sm"
        >
          {files.map((file) => (
            <option key={file} value={file}>{file}</option>
          ))}
        </select>
        <p className="text-sm text-gray-600 mt-2">文件大小：1.2MB，类型：PDF，上传时间：2025-04-10</p>
      </div>

      {/* 文件打开按钮 */}
      <div className="flex justify-center">
        <button
          className="bg-blue-600 text-white px-6 py-2 rounded-xl text-lg hover:bg-blue-700"
          onClick={() => console.log(`打开文件 ${selectedFile}`)}
        >
          🔍 查看文件
        </button>
      </div>

      {/* AI助手区块 */}
      <div className="bg-white shadow p-4 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">🤖 AI 生成助手</h2>
        <div className="flex gap-4">
          <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">📘 生成课程总结</button>
          <button className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600">📝 生成测试题</button>
        </div>
      </div>

      {/* 代码识别区块 */}
      <div className="bg-white shadow p-4 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">🧠 代码识别</h2>
        <button
          className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600"
          onClick={() => setShowCode(!showCode)}
        >
          {showCode ? "🔽 收起识别代码" : "🧩 启动代码识别"}
        </button>
        {showCode && (
          <ul className="mt-4 list-disc list-inside text-sm text-gray-700">
            <li>函数定义：detectFunction()</li>
            <li>主结构识别：parseMainBlock()</li>
            <li>循环处理：handleLoopStructure()</li>
          </ul>
        )}
      </div>

      {/* 交流评论区 */}
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
                  <button onClick={() => handleLike(idx)} className="text-sm text-blue-500 hover:underline">👍 点赞 ({likes[idx] || 0})</button>
                </div>
                <div className="mt-2">
                  <input
                    type="text"
                    value={replyInput[idx] || ""}
                    onChange={(e) => setReplyInput((prev) => ({ ...prev, [idx]: e.target.value }))}
                    placeholder="写下你的回复..."
                    className="w-full border rounded p-2 text-sm"
                  />
                  <button onClick={() => handleReplySubmit(idx)} className="mt-1 text-sm text-green-600 hover:underline">↩️ 回复</button>
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

      {/* 相关资源区 */}
      <div className="bg-white shadow p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4">🔗 相关资源</h2>
        <ul className="list-disc list-inside space-y-2 text-blue-600">
          {resources.map((r, idx) => (
            <li key={idx}>
              <a href={r.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {r.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
  }
  const [fileDetails, setFileDetails] = useState<FileDetails | null>(null);
  const [codeFiles, setCodeFiles] = useState<CodeFile[]>([]);
  const [showCode, setShowCode] = useState(false);
  const [likes, setLikes] = useState<{ [key: number]: number }>({});
  const [replies, setReplies] = useState<{ [key: number]: string[] }>({});
  const [replyInput, setReplyInput] = useState<{ [key: number]: string }>({});
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResultType, setAiResultType] = useState<"summary" | "quiz" | null>(null);
  const comments = [
    { user: "Alice", time: "2025-04-11 14:22", content: "这个文件讲得很清楚👍", page: "Lecture1.pdf", location: "第3页" },
    { user: "Bob", time: "2025-04-11 16:05", content: "有个地方我没看懂，第三页第二段。", page: "Lecture1.pdf", location: "第3页" },
    { user: "Cathy", time: "2025-04-10 10:30", content: "建议补充一个例题会更好。", page: "Lecture2.pdf", location: "第5页" },
  ];

  const resources = [
    { title: "算法笔记分享", link: "https://example.com/note" },
    { title: "课后习题答案", link: "https://example.com/answer" },
    { title: "推荐阅读资料", link: "https://example.com/resource" },
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
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.command === 'fileDetails') {
        setFileDetails(message.details);
      } else if (message.command === 'codeRecognitionResult') {
        setCodeFiles(message.codes);
      } else if (message.command === "aiSummaryResult") {
        setAiResult(message.content);
        setAiResultType("summary");
        setAiLoading(false);
      } else if (message.command === "aiQuizResult") {
        setAiResult(message.content);
        setAiResultType("quiz");
        setAiLoading(false);
      } else if (message.command === 'error') {
        console.error("出错：", message.error);
      }
    };

    window.addEventListener('message', handleMessage);
    vscode && vscode.postMessage({ command: 'getFileDetails', filePath });

    return () => window.removeEventListener('message', handleMessage);
  }, [filePath]);

  const runCodeRecognition = () => {
    vscode && vscode.postMessage({ command: 'runCodeRecognition', filePath });
    setShowCode(true);
  };
  const generateSummary = () => {
    if (vscode) {
      setAiLoading(true);
      vscode.postMessage({ command: "generateSummary", filePath });
    }
  };

  // AI生成助手：生成测试题
  const generateQuiz = () => {
    if (vscode) {
      setAiLoading(true);
      vscode.postMessage({ command: "generateQuiz", filePath });
    }
  };


  if (!vscode) {
    return <div className="p-10 text-center text-red-500">无法加载 VSCode API，请确认环境。</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <h1 className="text-3xl font-bold text-center mt-6">📄 文件详情</h1>

      {fileDetails ? (
        <div className="text-center">
          <p><strong>文件名：</strong>{filePath}</p>
          <p><strong>文件大小：</strong>{fileDetails.size}</p>
          <p><strong>文件类型：</strong>{fileDetails.type}</p>
          <p><strong>上传时间：</strong>{fileDetails.uploadedAt}</p>
          <p><strong>子文件夹：</strong>{fileDetails.subfolder}</p>
        </div>
      ) : "加载文件详情..."}

      <div className="flex justify-center">
        <button
          className="bg-blue-600 text-white px-6 py-2 rounded-xl text-lg hover:bg-blue-700"
          onClick={() => vscode && vscode.postMessage({ command: 'openFile', filePath })}
        >
          🔍 查看文件
        </button>
      </div>

      <div className="bg-white shadow p-4 rounded-xl">
  <h2 className="text-xl font-semibold mb-4">🧠 代码识别</h2>
  <button
    className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600"
    onClick={runCodeRecognition}
  >
    🚀 运行代码识别
      </button>

      {showCode && (
        <div className="mt-4">
          {codeFiles.length ? (
            codeFiles.map((code, idx) => {
              let formattedContent = "";

              try {
                // 尝试把字符串形式的数组解析成真正的数组
                const lines = JSON.parse(code.content);
                if (Array.isArray(lines)) {
                  formattedContent = lines.join("\n");
                } else {
                  formattedContent = code.content;
                }
              } catch (e) {
                // 如果解析失败，就原样输出
                formattedContent = code.content;
              }

              return (
                <div key={idx} className="bg-gray-100 rounded p-4 mb-2">
                  <p className="font-bold mb-2">{code.path}</p>
                  <pre className="overflow-auto max-h-64 whitespace-pre-wrap">
                    <code>{formattedContent}</code>
                  </pre>
                </div>
              );
            })
          ) : (
            "正在运行代码识别..."
          )}
        </div>
      )}
    </div>
      {/* AI生成助手区块 */}
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
            aiResultType === "summary" ? (
              <pre className="whitespace-pre-wrap">{aiResult}</pre>
            ) : aiResultType === "quiz" ? (
              <div>
                {aiResult.map((quiz: any, idx: number) => (
                  <div key={idx} className="mb-4">
                    <strong>{idx + 1}. {quiz.question}</strong>
                    {quiz.options && quiz.options.map((opt: string, i: number) => (
                      <p key={i}>{opt}</p>
                    ))}
                    <p className="text-green-600">答案: {quiz.answer}</p>
                    <p className="text-gray-600">解析: {quiz.explanation}</p>
                  </div>
                ))}
              </div>
            ) : null
          ) : null}
        </div>
      </div>
      {/* 交流评论区 */}
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
                  <button onClick={() => handleLike(idx)} className="text-sm text-blue-500 hover:underline">👍 点赞 ({likes[idx] || 0})</button>
                </div>
                <div className="mt-2">
                  <input
                    type="text"
                    value={replyInput[idx] || ""}
                    onChange={(e) => setReplyInput((prev) => ({ ...prev, [idx]: e.target.value }))}
                    placeholder="写下你的回复..."
                    className="w-full border rounded p-2 text-sm"
                  />
                  <button onClick={() => handleReplySubmit(idx)} className="mt-1 text-sm text-green-600 hover:underline">↩️ 回复</button>
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

      {/* 相关资源区 */}
      <div className="bg-white shadow p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4">🔗 相关资源</h2>
        <ul className="list-disc list-inside space-y-2 text-blue-600">
          {resources.map((r, idx) => (
            <li key={idx}>
              <a href={r.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {r.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
      
    </div>
  );

}