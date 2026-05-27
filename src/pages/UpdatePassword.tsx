import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';

export const UpdatePassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) return;
    
    if (password !== confirmPassword) {
      setError('Mật khẩu không khớp. Vui lòng thử lại.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/onboarding');
      }, 3000);
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
          <h1 className="text-2xl font-bold text-brand tracking-tight">Cập nhật mật khẩu</h1>
          <p className="text-text-soft mt-2">Vui lòng nhập mật khẩu mới của bạn</p>
        </div>

        {error && (
          <div className="mb-4 p-3 text-sm text-semantic-destructive bg-semantic-destructive/10 rounded-lg">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center">
            <div className="mb-4 p-4 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
              Mật khẩu đã được cập nhật thành công! Đang chuyển hướng...
            </div>
            <Button onClick={() => navigate('/onboarding')} className="w-full">
              Tiếp tục
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input 
              label="Mật khẩu mới" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
            <Input 
              label="Xác nhận mật khẩu mới" 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required 
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};
