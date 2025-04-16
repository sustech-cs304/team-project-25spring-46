import CourseCard from "../components/CourseCard";
import { getVsCodeApi } from '../vscodeApi';
import { useState, useEffect } from "react";
const vscode = getVsCodeApi();
export default function HomePage() {
  if(vscode == null) {return (
    <div className="flex flex-col items-center space-y-10">
      <h1 className="text-4xl font-extrabold font-serif text-center mt-6">📚 我的课程</h1>
      <div className="flex flex-col items-center space-y-6 w-full max-w-xl">
        <CourseCard title="数据结构" progress={75} ddl="2025-04-20" />
        <CourseCard title="操作系统" progress={40} ddl="2025-04-18" />
        <CourseCard title="AI导论" progress={90} ddl="2025-04-22" />
      </div>
      <div className="mt-auto pb-10 flex gap-4">
        <button className="bg-blue-600 text-white px-6 py-3 rounded-xl text-lg">➕ 添加课程</button>
        <button className="bg-gray-300 px-6 py-3 rounded-xl text-lg">📁 导入课程</button>
      </div>
    </div>
  );}
  // 课程数据数组，每项对象包含 name、progress、ddl 等字段
  const [courses, setCourses] = useState<
    Array<{ name: string; progress?: number; ddl?: string }>
  >([]);

  // 组件挂载时，设置消息监听，同时请求课程数据
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case "coursesData":
          // 后端返回的课程数据，更新页面
          setCourses(message.courses);
          break;
        case "createCourseResult":
          if (message.success) {
            // 课程创建成功后，主动再请求一次课程数据
            vscode && vscode.postMessage({ command: "getCourses" });
          } else {
            // alert("创建课程失败：" + message.error);
            console.error("创建课程失败：", message.error);
          }
          break;
        default:
          console.warn("未知的消息:", message);
      }
    };
    window.addEventListener("message", handleMessage);
    
    // 请求课程数据（例如：调用后端的 getCourses() 接口）
    vscode && vscode.postMessage({ command: "getCourses" });

    return () => window.removeEventListener("message", handleMessage);
  }, []);
  // 添加课程逻辑
  const handleAddCourse = () => {
    vscode && vscode.postMessage({ command: "createCourse" });
  };

  // 导入课程逻辑（示例，后续扩展）
  const handleImportCourse = () => {
    // alert("导入课程功能暂未实现");
    console.log("导入课程功能暂未实现");
    // 如果后端有导入课程接口，可这样调用：
    // vscode && vscode.postMessage({ command: "importCourse" });
  };

  return (
    <div className="flex flex-col items-center space-y-10">
      <h1 className="text-4xl font-extrabold font-serif text-center mt-6">
        📚 我的课程
      </h1>
      <div className="flex flex-col items-center space-y-6 w-full max-w-xl">
        {/* 遍历后端返回的课程数据，每个课程对象至少包含 name 属性；
            如果缺少 progress 或 ddl，则使用默认值 */}
        {courses.map((course, index) => (
          <CourseCard
            key={index}
            title={course.name}
            progress={course.progress !== undefined ? course.progress : 0}
            ddl={course.ddl || "2025-04-30"}
          />
        ))}
      </div>
      <div className="mt-auto pb-10 flex gap-4">
        <button
          className="bg-blue-600 text-white px-6 py-3 rounded-xl text-lg"
          onClick={handleAddCourse}
        >
          ➕ 添加课程
        </button>
        <button
          className="bg-gray-300 px-6 py-3 rounded-xl text-lg"
          onClick={handleImportCourse}
        >
          📁 导入课程
        </button>
      </div>
    </div>
  );
}