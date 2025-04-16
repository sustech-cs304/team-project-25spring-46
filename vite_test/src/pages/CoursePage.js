// CoursePage.tsx
import { useState, useEffect } from "react";
import ResourceCard from "../components/ResourceCard";
import { getVsCodeApi } from '../vscodeApi';
export default function CoursePage({ setSelectedFile }) {
    const vscode = getVsCodeApi();
    if (vscode == null) {
        const [currentCourse, setCurrentCourse] = useState("操作系统");
        const courses = ["操作系统", "数据结构", "AI导论"];
        return (<div className="flex flex-col items-center space-y-6">
        <div className="mt-6 text-center">
          <h1 className="text-3xl font-bold mb-2">📘 {currentCourse}</h1>
          <select value={currentCourse} onChange={(e) => setCurrentCourse(e.target.value)} className="border p-2 rounded-md">
            {courses.map((course) => (<option key={course} value={course}>{course}</option>))}
          </select>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10">
          <ResourceCard title="讲义" count={8} files={["Lecture1.pdf", "Lecture2.pdf"]}/>
          <ResourceCard title="作业" count={5} files={["HW1.docx", "HW2.docx"]}/>
          <ResourceCard title="资料" count={10} files={["Paper1.pdf"]}/>
          <ResourceCard title="笔记" count={3} files={["Note1.md"]}/>
        </div>
      </div>);
    }
    const [courses, setCourses] = useState([]);
    const [currentCourse, setCurrentCourse] = useState("");
    const [files, setFiles] = useState([[], [], [], []]);
    useEffect(() => {
        window.addEventListener("message", (event) => {
            const message = event.data;
            if (message.command === "coursesData") {
                setCourses(message.courses);
                if (message.courses.length > 0) {
                    setCurrentCourse(message.courses[0].name);
                    vscode.postMessage({ command: "getCourseFiles", courseName: message.courses[0].name });
                }
            }
            else if (message.command === "courseFilesData") {
                setFiles(message.files);
            }
        });
        vscode.postMessage({ command: "getCourses" });
    }, []);
    const handleCourseChange = (courseName) => {
        setCurrentCourse(courseName);
        vscode.postMessage({ command: "getCourseFiles", courseName });
    };
    const subfolders = ['讲义', '作业', '资料', '笔记'];
    return (<div className="flex flex-col items-center space-y-6">
      <div className="mt-6 text-center">
        <h1 className="text-3xl font-bold mb-2">📘 {currentCourse}</h1>
        <select value={currentCourse} onChange={(e) => handleCourseChange(e.target.value)} className="border p-2 rounded-md">
          {courses.map((course) => (<option key={course.name} value={course.name}>{course.name}</option>))}
        </select>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10">
        {subfolders.map((sub, index) => (<ResourceCard key={sub} title={sub} count={files[index].length} files={files[index]} 
        // onFileClick={(fileName) => setSelectedFile(`${currentCourse}/${sub}/${fileName}`)}
        onFileClick={(fileName) => setSelectedFile(`${currentCourse}/${sub}/${fileName}`)}/>))}
      </div>
    </div>);
}
//# sourceMappingURL=CoursePage.js.map