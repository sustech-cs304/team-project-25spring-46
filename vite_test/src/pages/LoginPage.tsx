import React, { useState, useEffect } from 'react';
import { getVsCodeApi } from '../vscodeApi';

const vscode = getVsCodeApi();

export type UserInfo = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type LoginPageProps = {
  onLoginSuccess: (user: UserInfo) => void;
  onSwitchToRegister: () => void;
};

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onSwitchToRegister }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // 密码目前不做校验
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.command === 'loginResult') {
        if (msg.success) {
          onLoginSuccess(msg.user as UserInfo);
        } else {
          setError(msg.error || '登录失败');
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLoginSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    vscode?.postMessage({ command: 'login', name, email, password });
  };

  const handleSwitch = () => {
    onSwitchToRegister();
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">登录</h2>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">姓名</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              placeholder="请输入您的姓名"
              required
            />
          </div>
          <div>
            <label className="block mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              placeholder="user@example.com"
              required
            />
          </div>
          <div>
            <label className="block mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              placeholder="请输入密码"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            登录
          </button>
        </form>
        <p className="mt-4 text-center">
        没有账号？{' '}
        <button onClick={handleSwitch} className="text-green-600 underline">
        注册
        </button>
        </p>
    </div>
  </div>
  );
};

export default LoginPage;
