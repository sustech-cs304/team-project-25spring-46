// vite_test/src/pages/CoursePage.tsx
import { useState, useEffect } from 'react';
import ResourceCard from '../components/ResourceCard';
import { getVsCodeApi } from '../vscodeApi';

interface CoursePageProps {
  initialCourseName?: string;
  setSelectedFile: (file: string) => void;
}

export default function CoursePage({ initialCourseName, setSelectedFile }: CoursePageProps) {
  const vscode = getVsCodeApi();

  // 本地模式下的静态示例
  if (vscode == null) {
    const [currentCourse, setCurrentCourse] = useState(initialCourseName ?? '操作系统');
    const courses = ['操作系统', '数据结构', 'AI导论'];
    return (
      <div className="flex flex-col items-center space-y-6">
        <div className="mt-6 text-center">
          <h1 className="text-3xl font-bold mb-2">📘 {currentCourse}</h1>
          <select
            value={currentCourse}
            onChange={e => setCurrentCourse(e.target.value)}
            className="border p-2 rounded-md"
          >
            {courses.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10">
          <ResourceCard title="讲义" count={8} files={['Lecture1.pdf', 'Lecture2.pdf']} />
          <ResourceCard title="作业" count={5} files={['HW1.docx', 'HW2.docx']} />
          <ResourceCard title="资料" count={10} files={['Paper1.pdf']} />
          <ResourceCard title="笔记" count={3} files={['Note1.md']} />
        </div>
      </div>
    );
  }

  // VSCode API 环境下动态加载
  const [courses, setCourses] = useState<{ name: string }[]>([]);
  const [currentCourse, setCurrentCourse] = useState(initialCourseName ?? '');
  const [files, setFiles] = useState<string[][]>([[], [], [], []]);
  const subfolders = ['讲义', '作业', '资料', '笔记'];

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.command === 'coursesData') {
        setCourses(msg.courses);
        const toLoad = initialCourseName && msg.courses.some((c: { name: string }) => c.name === initialCourseName)
          ? initialCourseName
          : msg.courses[0]?.name;
        setCurrentCourse(toLoad);
        vscode.postMessage({ command: 'getCourseFiles', courseName: toLoad });
      } else if (msg.command === 'courseFilesData') {
        setFiles(msg.files);
      }
    };
    window.addEventListener('message', handleMessage);
    vscode.postMessage({ command: 'getCourses' });
    return () => window.removeEventListener('message', handleMessage);
  }, [vscode, initialCourseName]);

  const handleCourseChange = (courseName: string) => {
    setCurrentCourse(courseName);
    vscode.postMessage({ command: 'getCourseFiles', courseName });
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="mt-6 text-center">
        <h1 className="text-3xl font-bold mb-2">📘 {currentCourse}</h1>
        <select
          value={currentCourse}
          onChange={e => handleCourseChange(e.target.value)}
          className="border p-2 rounded-md"
        >
          {courses.map(c => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10">
        {subfolders.map((sub, idx) => (
          <ResourceCard
            key={sub}
            title={sub}
            count={files[idx].length}
            files={files[idx]}
            onFileClick={fileName => setSelectedFile(`${currentCourse}/${sub}/${fileName}`)}
          />
        ))}
      </div>
    </div>
  );
}
