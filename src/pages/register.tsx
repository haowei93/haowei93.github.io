import { useState } from 'react';
import Layout from '@/components/Layout';

const RegisterPage = () => {
  const [corosAccount, setCorosAccount] = useState('');
  const [corosPassword, setCorosPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setUserId(null);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ corosAccount, corosPassword }),
      });

      const contentType = response.headers.get('content-type') ?? '';
      let payload: any = null;
      if (contentType.includes('application/json')) {
        payload = await response.json();
      } else {
        const text = await response.text();
        payload = text ? { error: text } : null;
      }
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Registration failed.');
      }

      setUserId(payload?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="w-full max-w-xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">创建你的跑步主页</h1>
          <p className="text-sm text-gray-400">
            输入 Coros 账号信息，我们会生成一个独立的主页地址。
          </p>
        </header>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Coros 账号</span>
            <input
              className="w-full rounded border border-gray-700 bg-transparent px-3 py-2"
              type="text"
              required
              value={corosAccount}
              onChange={(event) => setCorosAccount(event.target.value)}
              placeholder="邮箱或手机号"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Coros 密码</span>
            <input
              className="w-full rounded border border-gray-700 bg-transparent px-3 py-2"
              type="password"
              required
              value={corosPassword}
              onChange={(event) => setCorosPassword(event.target.value)}
              placeholder="用于同步数据"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-white px-4 py-2 text-black disabled:opacity-50"
          >
            {isSubmitting ? '提交中...' : '创建主页'}
          </button>
        </form>

        {userId && (
          <div className="rounded border border-green-400/40 bg-green-500/10 p-4">
            <p className="text-sm text-green-300">创建成功</p>
            <p className="text-base font-semibold">/users/{userId}</p>
            <a
              className="text-sm text-green-200 underline"
              href={`/users/${userId}`}
            >
              前往主页
            </a>
          </div>
        )}

        <p className="text-xs text-gray-500">
          数据每 24 小时同步一次。也可以联系管理员手动触发。
        </p>
      </div>
    </Layout>
  );
};

export default RegisterPage;
