export default function CourseCard({ title, progress, ddl }) {
    return (<div className="bg-white p-4 rounded-xl shadow w-full">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="w-full bg-gray-200 h-2 rounded mt-2">
        <div className="bg-blue-600 h-2 rounded" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="text-sm text-gray-600 mt-2">DDL：{ddl}</div>
    </div>);
}
//# sourceMappingURL=CourseCard.js.map