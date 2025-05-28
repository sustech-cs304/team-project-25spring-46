// calendarPage.tsx
import { useEffect, useState } from "react";
import { getVsCodeApi } from "../vscodeApi";

type Task = {
  id: number;
  title: string;
  status: string;
  due_date: string;
  priority: string;
  details: string;
  completion: boolean;
  group_id: number | null;
  assignee_id: number | null;
};

export default function AllMyTasks() {
  const vscode = getVsCodeApi();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    vscode.postMessage({ command: "getMyTasks" });
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleMessage = (event: MessageEvent) => {
    const message = event.data;
    if (message.command === "getMyTasksResult" && message.success) {
      setTasks(message.tasks);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 p-6">
      <h1 className="text-3xl font-bold">📝 我的任务</h1>

      <div className="overflow-x-auto w-full max-w-5xl">
        <table className="min-w-full border border-gray-300 table-auto mt-4">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2">标题</th>
              <th className="border px-3 py-2">状态</th>
              <th className="border px-3 py-2">截止时间</th>
              <th className="border px-3 py-2">优先级</th>
              <th className="border px-3 py-2">完成状态</th>
              <th className="border px-3 py-2">详情</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                className="text-center"
              >
                <td className="border px-3 py-2">{task.title}</td>
                <td className="border px-3 py-2">{task.status}</td>
                <td className="border px-3 py-2">{new Date(task.due_date).toLocaleString()}</td>
                <td className="border px-3 py-2">{task.priority}</td>
                <td className="border px-3 py-2">{task.completion ? "已完成" : "未完成"}</td>
                <td className="border px-3 py-2">{task.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
