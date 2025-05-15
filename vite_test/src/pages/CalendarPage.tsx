// calendarPage.tsx
import { useEffect, useState } from "react";
import { getVsCodeApi } from "../vscodeApi";
import TaskSidebar, { TaskFormData } from "./calendarComponents/TaskSidebar.tsx";

type Task = {
  id: number;
  title: string;
  status: string;
  due_date: string;
  priority: string;
  course_name: string;
  project_name: string | null;
  details: string;
  // feedback?: string;
};

type Course = {
  id: number;
  name: string;
};
interface Project {
  id: number;
  name: string;
}
export default function AllMyTasks() {
  const vscode = getVsCodeApi();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [projects, setProjects] = useState<Project[]>([]); // 添加 projects 状态
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskFormData | undefined>();
  const [mode, setMode] = useState<"create" | "update">("create");

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    vscode.postMessage({ command: "getMyTasks" });
    vscode.postMessage({ command: "getCourses" });
    vscode.postMessage({ command: "getProjects" }); // 请求项目列表
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleMessage = (event: MessageEvent) => {
    const message = event.data;
    switch (message.command) {
      case "getMyTasks":
        setTasks(message.tasks);
        setSelectedTaskId(null);
        break;
      case "coursesData":
        setCourses(message.courses);
        break;
      case "projectsData": // 处理项目列表数据
        setProjects(message.projects);
        break;
      case "createTaskResult":
      case "updateTaskResult":
      case "deleteTaskResult":
        vscode.postMessage({ command: "getMyTasks" });
        break;
    }
  };

  const handleRowClick = (id: number) => {
    setSelectedTaskId(id === selectedTaskId ? null : id);
  };

  const handleUpdate = () => {
    if (selectedTaskId !== null) {
      const task = tasks.find((t) => t.id === selectedTaskId); // 根据任务 ID 获取任务数据
      if (task) {
        console.log("Selected Task for Update:", task); // 添加日志，检查任务数据 
        setEditingTask(task); // 设置当前编辑的任务
        setMode("update"); // 设置模式为更新
        setSidebarVisible(true); // 打开侧边栏
      } else {
        vscode.window.showErrorMessage(`未找到任务 ID: ${selectedTaskId}`);
      }
    }
  };
  const handleCreate = () => {
    setEditingTask(undefined);
    setMode("create");
    setSidebarVisible(true);
  };

  const handleDelete = () => {
    if (selectedTaskId !== null) {
      vscode.postMessage({ command: "deleteTask", taskId: selectedTaskId });
    }
  };

  const handleSidebarSubmit = (formData: TaskFormData) => {
    console.log("CalendarPage - handleSidebarSubmit formData:", formData); // 添加日志
    setSidebarVisible(false);
    if (mode === "create") {vscode.postMessage({
        command: "createTask",
        data: {
          title: formData.title,
          details: formData.details,
          due_date: formData.due_date,
          status: formData.status, // 确保 status 被包含在消息中
          priority: formData.priority,
          course_id: formData.course_id,
          project_id: formData.project_id || null,
        },
      });
    } else if (mode === "update" && selectedTaskId !== null) {
      console.log("CalendarPage - updateTask data:", { id: selectedTaskId, ...formData }); // 添加日志
      vscode.postMessage({
        command: "updateTask",
        data: {
          id: selectedTaskId, // 传递任务 ID
          ...formData,
        },
      });
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 p-6">
      <h1 className="text-3xl font-bold">📝 我的任务</h1>
      <div className="space-x-4">
        <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={handleCreate}>
          ➕ 创建任务
        </button>
        <button
          className="bg-yellow-500 text-white px-4 py-2 rounded"
          onClick={handleUpdate}
          disabled={selectedTaskId === null}
        >
          ✏️ 编辑选中任务
        </button>
        <button
          className="bg-red-500 text-white px-4 py-2 rounded"
          onClick={handleDelete}
          disabled={selectedTaskId === null}
        >
          🗑 删除选中任务
        </button>
      </div>

      <div className="overflow-x-auto w-full max-w-5xl">
        <table className="min-w-full border border-gray-300 table-auto mt-4">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2">标题</th>
              <th className="border px-3 py-2">状态</th>
              <th className="border px-3 py-2">截止时间</th>
              <th className="border px-3 py-2">优先级</th>
              <th className="border px-3 py-2">课程</th>
              <th className="border px-3 py-2">项目</th>
              <th className="border px-3 py-2">详情</th>
              {/* <th className="border px-3 py-2">反馈</th> */}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                onClick={() => handleRowClick(task.id)}
                className={`text-center cursor-pointer ${
                  selectedTaskId === task.id ? "bg-blue-100" : ""
                }`}
              >
                <td className="border px-3 py-2">{task.title}</td>
                <td className="border px-3 py-2">{task.status}</td>
                <td className="border px-3 py-2">{new Date(task.due_date).toLocaleString()}</td>
                <td className="border px-3 py-2">{task.priority}</td>
                <td className="border px-3 py-2">{task.course_name}</td>
                <td className="border px-3 py-2">{task.project_name || "无"}</td>
                <td className="border px-3 py-2">{task.details}</td>
                {/* <td className="border px-3 py-2">{task.feedback || "无"}</td> */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TaskSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        onSubmit={handleSidebarSubmit}
        task={editingTask}
        courses={courses}
        projects={projects} // 添加 projects 属性
        mode={mode}
      />
    </div>
  );
}
