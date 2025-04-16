import { useState } from "react";
import HomePage from "./pages/HomePage";
import CoursePage from "./pages/CoursePage";
import CalendarPage from "./pages/CalendarPage";
import FilePage from "./pages/FilePage";

export default function App() {
  const [currentPage, setCurrentPage] = useState("CoursePage");
  const [selectedFile, setSelectedFile] = useState("");

  const renderPage = () => {
    if (selectedFile) return <FilePage filePath={selectedFile} />;
    switch (currentPage) {
      case "HomePage": return <HomePage />;
      case "CoursePage": return <CoursePage setSelectedFile={setSelectedFile} />;
      case "CalendarPage": return <CalendarPage />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <select
        value={currentPage}
        onChange={(e) => setCurrentPage(e.target.value)}
        className="border p-2 rounded-md bg-white shadow"
      >
        <option value="HomePage">主页</option>
        <option value="CoursePage">课程页面</option>
        <option value="CalendarPage">日历页面</option>
      </select>
      {selectedFile && (
        <button onClick={() => setSelectedFile("")} className="mt-2 p-2 bg-blue-500 text-white rounded">返回课程页面</button>
      )}
      {renderPage()}
    </div>
  );
}
