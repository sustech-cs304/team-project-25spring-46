// vite_test/src/components/CourseCard.tsx
interface CourseCardProps {
  title: string;
  createdAt: string;
  onClick?: () => void;
  onDelete?: () => void;
}

export default function CourseCard({
  title,
  createdAt,
  onClick,
  onDelete,
}: CourseCardProps) {
  return (
    <div
      onClick={onClick}
      className="relative bg-white p-4 rounded-xl shadow w-full cursor-pointer hover:shadow-md transition-shadow"
    >
      {/* 右上角删除按钮 */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-2 right-2 text-red-500 text-sm hover:text-red-700"
        >
          删除
        </button>
      )}

      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="text-sm text-gray-600 mt-2">
        创建于：{new Date(createdAt).toLocaleString()}
      </div>
    </div>
  );
}
