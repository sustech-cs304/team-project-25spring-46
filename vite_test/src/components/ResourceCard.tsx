import { useState } from "react";

// 增加了 onFileClick 可选属性
interface ResourceCardProps {
  title: string;
  count: number;
  files: string[];
  onFileClick?: (fileName: string) => void;
}

export default function ResourceCard({ title, count, files, onFileClick }: ResourceCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white p-4 rounded-xl shadow flex flex-col items-center w-48">
      <div className="text-2xl">📂</div>
      <div className="font-bold mt-2">{title}</div>
      <div className="text-sm text-gray-500">{count} 个文件</div>
      <button
        className="mt-2 text-blue-600 hover:underline"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "▲ 收起" : "▼ 展开文件列表"}
      </button>
      {expanded && (
        <ul className="text-sm mt-2 text-gray-700 list-disc list-inside">
          {files.map((file, idx) => (
            <li key={idx}>
              {onFileClick ? (
                <button 
                  className="text-blue-500 hover:underline"
                  onClick={() => onFileClick(file)}
                >
                  {file}
                </button>
              ) : (
                file
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
