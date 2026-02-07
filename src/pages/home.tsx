import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';

const LandingPage = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');

  const handleGo = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = userId.trim();
    if (!trimmed) return;
    navigate(`/users/${trimmed}`);
  };

  return (
    <Layout>
      <div className="w-full max-w-3xl space-y-10">
        <section className="space-y-4">
          <h1 className="text-4xl font-semibold">多人跑步主页</h1>
          <p className="text-base text-gray-400">
            为每位 Coros 用户生成独立主页，路径为{' '}
            <span className="font-mono">/users/&lt;id&gt;</span>。
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/register"
              className="rounded bg-white px-4 py-2 text-black"
            >
              创建主页
            </a>
            <a
              href="/register"
              className="rounded border border-white/30 px-4 py-2"
            >
              查看注册说明
            </a>
          </div>
        </section>

        <section className="space-y-3 rounded border border-white/10 p-6">
          <h2 className="text-lg font-semibold">已有主页？</h2>
          <p className="text-sm text-gray-400">
            请输入你的 6 位用户 ID 直接访问。
          </p>
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleGo}>
            <input
              className="flex-1 rounded border border-gray-700 bg-transparent px-3 py-2"
              placeholder="例如 a1b2c3"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
            />
            <button
              type="submit"
              className="rounded bg-white px-4 py-2 text-black"
            >
              进入主页
            </button>
          </form>
        </section>

        <section className="space-y-2 text-sm text-gray-400">
          <p>数据每天同步一次，如需手动同步请联系管理员。</p>
          <p>如果你刚注册，首次数据生成可能需要几分钟。</p>
        </section>
      </div>
    </Layout>
  );
};

export default LandingPage;
