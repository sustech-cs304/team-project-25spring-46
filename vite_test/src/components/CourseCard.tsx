// vite_test/src/components/CourseCard.tsx
interface CourseCardProps {
  title: string;
  progress: number;
  ddl: string;
  onClick?: () => void;
}

export default function CourseCard({ title, progress, ddl, onClick }: CourseCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white p-4 rounded-xl shadow w-full cursor-pointer hover:shadow-md transition-shadow"
    >
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="w-full bg-gray-200 h-2 rounded mt-2">
        <div className="bg-blue-600 h-2 rounded" style={{ width: `${progress}%` }} />
      </div>
      <div className="text-sm text-gray-600 mt-2">DDL：{ddl}</div>
    </div>
  );
}
