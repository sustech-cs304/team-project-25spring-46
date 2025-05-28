// calendarComponents/TaskSidebar.tsx
import React, { useState, useEffect } from "react";

export interface TaskFormData {
  // id?: number;
  title: string;
  details?: string;
  due_date: string;
  priority: string;
  status: string;
  feedback?: string;
  course_id?: number; // only for create
  project_id?: number | null; // 添加 project_id 字段
}

interface Course {
  id: number;
  name: string;
}
interface Project {
  id: number;
  name: string;
}
interface TaskSidebarProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (formData: TaskFormData) => void;
  task?: TaskFormData;
  courses: Course[];
  projects: Project[]; // 添加项目列表
  mode: "create" | "update";
}

const TaskSidebar: React.FC<TaskSidebarProps> = ({ visible, onClose, onSubmit, task, courses, projects,mode }) => {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("upcoming");
  const [dueDate, setDueDate] = useState("");
  // const [feedback, setFeedback] = useState("");
  const [courseId, setCourseId] = useState<number | undefined>();
  const [projectId, setProjectId] = useState<number | null>(null);

  useEffect(() => {
    if (task) {
      console.log("TaskSidebar - Received Task:", task); // 添加日志，检查传入的任务数据
      setTitle(task.title || "");
      setDetails(task.details || "");
      setPriority(task.priority || "medium");
      setStatus(task.status || "upcoming");
      setDueDate(task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : "");
      // setFeedback(task.feedback || "");
      setCourseId(task.course_id);
      setProjectId(task.project_id || null); // 初始化 projectId
    } else {
      setTitle("");
      setDetails("");
      setPriority("medium");
      setStatus("upcoming");
      setDueDate("");
      // setFeedback("");
      setCourseId(undefined);
      setProjectId(null); // 重置 projectId
    }
  }, [task]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-96 bg-white border-l border-gray-300 shadow-lg p-6 z-50">
      <h2 className="text-xl font-bold mb-4">{mode === "create" ? "创建任务" : "编辑任务"}</h2>
      <div className="space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="任务标题"
          className="w-full border p-2 rounded"
        />
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="任务详情"
          className="w-full border p-2 rounded"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="low">低</option>
          <option value="medium">中</option>
          <option value="high">高</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="upcoming">未开始</option>
          <option value="inprogress">进行中</option>
          <option value="completed">已完成</option>
          <option value="need review">需复查</option>
        </select>
        <input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full border p-2 rounded"
        />

        {mode === "create" && (
          <>
            <select
              value={courseId ?? ""}
              onChange={(e) => setCourseId(parseInt(e.target.value))}
              className="w-full border p-2 rounded"
            >
              <option value="">选择课程</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
            <select
              value={projectId ?? ""}
              onChange={(e) => setProjectId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full border p-2 rounded"
            >
              <option value="">选择项目</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
      <div className="flex justify-between mt-6">
        <button className="text-gray-500 hover:underline" onClick={onClose}>
          取消
        </button>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => {
            if (!dueDate) {
              alert("请填写任务的截止日期！");
              return;
            }
            const formData = {
              title,
              details,
              status,
              priority,
              due_date: dueDate,
              course_id: mode === "create" ? courseId : undefined,
              project_id: mode === "create" ? projectId : undefined,
              // feedback: mode === "update" ? feedback : undefined,
            };
            console.log("TaskSidebar - onSubmit formData:", formData); // 添加日志
            onSubmit(formData);
          }}
        >
          提交
        </button>
      </div>
    </div>
  );
};

export default TaskSidebar;
