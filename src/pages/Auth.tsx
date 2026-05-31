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
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login, register, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (isForgotPassword) {
        await resetPassword(email);
        setSuccess('Link khôi phục mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư đến (hoặc thư rác).');
      } else if (isRegister) {
        await register(email, password);
        // Supabase auto logins on successful signup
        navigate('/');
      } else {
        await login(email, password);
        navigate('/');
      }
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

        {success && (
          <div className="mb-4 p-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
            {success}
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
          {!isForgotPassword && (
            <div>
              <Input 
                label="Mật khẩu" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
              {!isRegister && (
                <div className="mt-2 text-right">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError('');
                      setSuccess('');
                    }}
                    className="text-xs text-brand hover:underline font-medium"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
              )}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Đang xử lý...' : (isForgotPassword ? 'Gửi link khôi phục' : isRegister ? 'Đăng ký' : 'Đăng nhập')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={() => {
              if (isForgotPassword) {
                setIsForgotPassword(false);
              } else {
                setIsRegister(!isRegister);
              }
              setError('');
              setSuccess('');
            }}
            className="text-brand-accent hover:underline text-sm font-semibold"
          >
            {isForgotPassword 
              ? 'Quay lại đăng nhập' 
              : isRegister 
                ? 'Đã có tài khoản? Đăng nhập' 
                : 'Chưa có tài khoản? Đăng ký'}
          </button>
        </div>
      </Card>
    </div>
  );
};
