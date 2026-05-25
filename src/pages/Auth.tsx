import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';

export const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setError('');
    
    try {
      if (isRegister) {
        await register(email, password);
        // Supabase auto logins on successful signup
      } else {
        await login(email, password);
      }
      navigate('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand tracking-tight">Friend Care</h1>
          <p className="text-text-soft mt-2">Nơi chăm sóc không gian của bạn</p>
        </div>

        {error && (
          <div className="mb-4 p-3 text-sm text-semantic-destructive bg-semantic-destructive/10 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input 
            label="Email" 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
          <Input 
            label="Mật khẩu" 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Đang xử lý...' : (isRegister ? 'Đăng ký' : 'Đăng nhập')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-brand-accent hover:underline text-sm font-semibold"
          >
            {isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
          </button>
        </div>
      </Card>
    </div>
  );
};
