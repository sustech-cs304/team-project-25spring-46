import React, { useState, useEffect } from 'react';
import { getVsCodeApi } from '../../vscodeApi';

interface Task {
  id: number;
  title: string;
  details: string | null;
  due_date: string;
  status: string;
  priority: string;
  assignee_id: number | null;
  assignee_name: string | null;
}

interface GroupTaskPageProps {
  groupId: number;
  groupName: string;
}

const GroupTaskPage: React.FC<GroupTaskPageProps> = ({ groupId, groupName }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const vscode = getVsCodeApi();

  useEffect(() => {
    // Request tasks when component mounts or groupId changes
    vscode.postMessage({ command: 'getGroupTasks', groupId });
  }, [groupId]);

  useEffect(() => {
    // Listen for task data from extension
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'groupTasksData') {
        setTasks(message.tasks);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="group-tasks-container">
      <h2>{groupName} 的任务列表</h2>
      <div className="tasks-table">
        <table className="min-w-full border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2">标题</th>
              <th className="border px-3 py-2">状态</th>
              <th className="border px-3 py-2">截止时间</th>
              <th className="border px-3 py-2">优先级</th>
              <th className="border px-3 py-2">负责人</th>
              <th className="border px-3 py-2">详情</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="border px-3 py-2">{task.title}</td>
                <td className="border px-3 py-2">{task.status}</td>
                <td className="border px-3 py-2">
                  {new Date(task.due_date).toLocaleString()}
                </td>
                <td className="border px-3 py-2">{task.priority}</td>
                <td className="border px-3 py-2">{task.assignee_name || '未分配'}</td>
                <td className="border px-3 py-2">{task.details || '无'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GroupTaskPage; 