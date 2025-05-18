import { useState, useEffect } from 'react';
import LoginPage, { UserInfo } from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import CoursePage from './pages/CoursePage';
import CalendarPage from './pages/CalendarPage';
import FilePage from './pages/FilePage';
import DemoPage from './pages/DemoPage';
import DisplayPage from './pages/DisplayPage';
import { getVsCodeApi } from './vscodeApi';

const vscode = getVsCodeApi();

export default function App() {
  type Page = 'LoginPage' | 'RegisterPage' | 'HomePage' | 'CoursePage' | 'CalendarPage' | 'DemoPage' | 'DisplayPage' | 'FilePage';
  const [currentPage, setCurrentPage] = useState<Page>('LoginPage');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>('');

  // 处理来自后端的登出和获取当前用户消息
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.command === 'logoutResult' && msg.success) {
        setUser(null);
        setCurrentPage('LoginPage');
      }
      if (msg.command === 'currentUseridResult') {
        // 如果未登录，保持在登录页
        if (!msg.userId) {
          setUser(null);
          setCurrentPage('LoginPage');
        }
      }
    };
    window.addEventListener('message', handleMessage);
    // 启动时询问一下后端当前登录状态
    vscode?.postMessage({ command: 'getCurrentUserid' });
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleLoginSuccess = (u: UserInfo) => {
    setUser(u);
    setCurrentPage('HomePage');
  };
  const handleRegisterSuccess = (u: UserInfo) => {
    setUser(u);
    setCurrentPage('HomePage');
  };

  const handleLogout = () => {
    vscode?.postMessage({ command: 'logout' });
  };

  // 渲染切页
  const renderPage = () => {
    if (!user) {
      return currentPage === 'RegisterPage'
        ? <RegisterPage onRegisterSuccess={handleRegisterSuccess} onSwitchToLogin={() => setCurrentPage('LoginPage')} />
        : <LoginPage onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => setCurrentPage('RegisterPage')} />;
    }
    if (currentPage === 'FilePage' && selectedFile) {
      return <FilePage
               filePath={selectedFile}
               onView={() => setCurrentPage('DisplayPage')}
             />;
    }
    if (currentPage === 'DisplayPage' && selectedFile) {
      return <DisplayPage filePath={selectedFile} />;
    }
    switch (currentPage) {
      case 'HomePage':    return <HomePage />;
      case 'CoursePage': return (
        <CoursePage
          setSelectedFile={file => {
            setSelectedFile(file);
            setCurrentPage('FilePage');
          }}
        />
      );
      case 'CalendarPage':return <CalendarPage />;
      case 'DemoPage':    return <DemoPage />;
      default:            return <HomePage />;
    }
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      {/* 登录后顶部工具栏 */}
      {user && (
        <div className="flex justify-between items-center mb-4">
          <div>欢迎，{user.name}</div>
          <div className="flex gap-2">
            <select
              value={currentPage}
              onChange={e => setCurrentPage(e.target.value as any)}
              className="border p-2 rounded-md bg-white shadow"
            >
              <option value="HomePage">主页</option>
              <option value="CoursePage">课程页面</option>
              <option value="CalendarPage">日历页面</option>
              <option value="DemoPage">🧪 Demo 测试</option>
            </select>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              注销
            </button>
          </div>
        </div>
      )}

      {selectedFile && (
        <button
          onClick={() => setSelectedFile('')}
          className="mt-2 p-2 bg-blue-500 text-white rounded"
        >
          返回课程页面
        </button>
      )}

      {renderPage()}
    </div>
  );
}
