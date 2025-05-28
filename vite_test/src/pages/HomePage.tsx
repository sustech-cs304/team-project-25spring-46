// vite_test/src/pages/HomePage.tsx
import CourseCard from '../components/CourseCard';
import { getVsCodeApi } from '../vscodeApi';
import { useState, useEffect } from 'react';

interface Course {
  id: number;
  name: string;
  created_at: string;
}

interface HomePageProps {
  onCourseClick: (courseName: string) => void;
}

export default function HomePage({ onCourseClick }: HomePageProps) {
  const vscode = getVsCodeApi();

  // VSCode API 环境下动态拉取课程
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.command === 'coursesData') {
        setCourses(msg.courses);
      }
    };
    window.addEventListener('message', handleMessage);
    vscode?.postMessage({ command: 'getCourses' });
    return () => window.removeEventListener('message', handleMessage);
  }, [vscode]);

  const handleAddCourse = () => {
    vscode?.postMessage({ command: 'createCourse' });
  };

  // 删除某个课程
  const handleDelete = (id: number) => {
    vscode?.postMessage({ command: 'deleteCourse', courseId: id });
  };

  return (
    <div className="flex flex-col items-center space-y-10">
      <h1 className="text-4xl font-extrabold font-serif text-center mt-6">📚 我的课程</h1>
      <div className="flex flex-col items-center space-y-6 w-full max-w-xl">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            title={course.name}
            createdAt={course.created_at}
            onClick={() => onCourseClick(course.name)}
            onDelete={() => handleDelete(course.id)}
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
