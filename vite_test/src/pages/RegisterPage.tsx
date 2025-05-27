import React, { useState, useEffect } from 'react';
import { getVsCodeApi } from '../vscodeApi';
import { UserInfo } from './LoginPage';  // 与 LoginPage 共用类型

const vscode = getVsCodeApi();

type RegisterPageProps = {
  onRegisterSuccess: (user: UserInfo) => void;
  onSwitchToLogin: () => void;
};

export default function RegisterPage({ onRegisterSuccess, onSwitchToLogin }: RegisterPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, _] = useState(''); // 密码暂时不校验
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.command === 'registerResult') {
        if (msg.success) {
          onRegisterSuccess(msg.user as UserInfo);
        } else {
          setError(msg.error || '注册失败');
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onRegisterSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    vscode?.postMessage({ command: 'register', name, email, password });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">注册</h2>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">姓名</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border px-3 py-2 rounded"
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
              required
            />
          </div>
          {/* 密码字段 */}
          <div>
            <label className="block mb-1">密码</label>
            <input
              type="password"
              className="w-full border px-3 py-2 rounded"
              placeholder="任意输入"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
          >
            注册
          </button>
        </form>
        <p className="mt-4 text-center">
          已有账号？{' '}
          <button onClick={onSwitchToLogin} className="text-blue-600 underline">
            去登录
          </button>
        </p>
      </div>
    </div>
  );
}
