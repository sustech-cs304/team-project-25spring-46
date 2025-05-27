// vite_test/src/pages/HomePage.tsx
import CourseCard from '../components/CourseCard';
import { getVsCodeApi } from '../vscodeApi';
import { useState, useEffect } from 'react';

interface HomePageProps {
  onCourseClick: (courseName: string) => void;
}

export default function HomePage({ onCourseClick }: HomePageProps) {
  const vscode = getVsCodeApi();

  // 无 VSCode API 时的静态展示
  if (vscode == null) {
    const [courses] = useState<string[]>(['数据结构', '操作系统', 'AI导论']);
    return (
      <div className="flex flex-col items-center space-y-10">
        <h1 className="text-4xl font-extrabold font-serif text-center mt-6">📚 我的课程</h1>
        <div className="flex flex-col items-center space-y-6 w-full max-w-xl">
          {courses.map((c, i) => (
            <CourseCard
              key={i}
              title={c}
              progress={i === 0 ? 75 : i === 1 ? 40 : 90}
              ddl={i === 0 ? '2025-04-20' : i === 1 ? '2025-04-18' : '2025-04-22'}
              onClick={() => onCourseClick(c)}
            />
          ))}
        </div>
        <div className="mt-auto pb-10 flex gap-4">
          <button
            onClick={() => vscode?.postMessage({ command: 'createCourse' })}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl text-lg"
          >
            ➕ 添加课程
          </button>
        </div>
      </div>
    );
  }

  // VSCode API 环境下动态拉取课程
  const [courses, setCourses] = useState<Array<{ name: string; progress?: number; ddl?: string }>>([]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.command === 'coursesData') {
        setCourses(msg.courses);
      }
    };
    window.addEventListener('message', handleMessage);
    vscode.postMessage({ command: 'getCourses' });
    return () => window.removeEventListener('message', handleMessage);
  }, [vscode]);

  const handleAddCourse = () => {
    vscode.postMessage({ command: 'createCourse' });
  };

  return (
    <div className="flex flex-col items-center space-y-10">
      <h1 className="text-4xl font-extrabold font-serif text-center mt-6">📚 我的课程</h1>
      <div className="flex flex-col items-center space-y-6 w-full max-w-xl">
        {courses.map((course, idx) => (
          <CourseCard
            key={idx}
            title={course.name}
            progress={course.progress ?? 0}
            ddl={course.ddl ?? '2025-04-30'}
            onClick={() => onCourseClick(course.name)}
          />
        ))}
      </div>
      <div className="mt-auto pb-10 flex gap-4">
        <button
          onClick={handleAddCourse}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl text-lg"
        >
          ➕ 添加课程
        </button>
      </div>
    </div>
  );
}
