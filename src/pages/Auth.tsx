import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { Heart, Sparkles, Waves } from 'lucide-react';

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
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-canvas p-4 sm:p-8"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div aria-hidden="true" className="absolute -left-20 -top-24 h-[28rem] w-[28rem] rounded-full bg-[#A8D9EE]/55 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-32 -right-20 h-[30rem] w-[30rem] rounded-full bg-[#A8D5C0]/45 blur-3xl" />
      <div aria-hidden="true" className="absolute right-1/3 top-1/3 h-[18rem] w-[18rem] rounded-full bg-[#EDD9B8]/20 blur-3xl" />
      <div aria-hidden="true" className="ocean-dots absolute inset-0 opacity-40" />

      <Card padding="none" animate={false} className="relative grid w-full max-w-5xl overflow-hidden border-white/90 bg-white/72 shadow-[0_12px_56px_-20px_rgba(13,53,71,0.30)] lg:grid-cols-[1.08fr_0.92fr]">
        {/* ── Left Decorative Panel ── */}
        <section className="relative hidden min-h-[600px] overflow-hidden bg-gradient-to-br from-brand-house via-brand to-brand-uplift p-9 text-white lg:flex lg:flex-col lg:justify-between">
          {/* Decorative cactus-ocean ring */}
          <div aria-hidden="true" className="absolute -right-20 top-20 h-64 w-64 rounded-full border-[40px] border-white/08" />
          {/* Subtle cactus blob bottom-left */}
          <div aria-hidden="true" className="absolute -bottom-10 -left-8 h-48 w-48 rounded-full bg-cactus/20 blur-2xl" />
          <Waves aria-hidden="true" className="absolute -bottom-8 -left-10 h-44 w-[32rem] text-white/08" strokeWidth={0.6} />
          <div className="relative flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-[14px] bg-white/15 backdrop-blur-md">
              <Waves className="h-5 w-5" />
              <Heart className="absolute -bottom-1 -right-1 h-3.5 w-3.5 fill-coral text-coral" />
            </div>
            <div>
              <p className="ui-kicker text-brand-light/80">Our little tide</p>
              <p className="font-display text-[22px] font-semibold italic">Friend Care</p>
            </div>
          </div>

          <div className="relative max-w-md">
            <Sparkles className="mb-4 h-5 w-5 text-cactus-light" />
            <h1 className="font-display text-[44px] font-semibold italic leading-[1.06]">Những điều nhỏ bé cũng xứng đáng được lưu lại.</h1>
            <p className="body-copy mt-5 max-w-sm text-[13px] text-white/65">Một không gian riêng cho hai người — đủ yên để lắng nghe, đủ gần để quan tâm.</p>
          </div>

          <p className="relative text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/40">Made for the people who stay</p>
        </section>

        {/* ── Right Form Panel ── */}
        <section className="flex min-h-[500px] items-center p-6 sm:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-7">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[12px] bg-brand-pale text-brand lg:hidden">
                <Waves className="h-5 w-5" />
              </div>
              <p className="ui-kicker mb-1.5 text-brand-accent">Chào mừng trở lại</p>
              <h2 className="display-title text-[34px] text-brand-house">
                {isForgotPassword ? 'Tìm lại lối vào' : isRegister ? 'Tạo góc nhỏ của bạn' : 'Ghé vào một chút nhé'}
              </h2>
              <p className="body-copy mt-2 text-[13px] text-text-soft">
                {isForgotPassword ? 'Nhập email để nhận liên kết khôi phục mật khẩu.' : 'Đăng nhập để tiếp tục những câu chuyện còn dang dở.'}
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-2xl bg-semantic-destructive/10 p-3 text-sm text-semantic-destructive">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-2xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-700">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    <div className="mt-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setError('');
                          setSuccess('');
                        }}
                        className="text-[12px] font-semibold text-brand hover:underline"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                  )}
                </div>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? 'Đang xử lý...' : (isForgotPassword ? 'Gửi link khôi phục' : isRegister ? 'Đăng ký' : 'Đăng nhập')}
              </Button>
            </form>

            <div className="mt-5 text-center">
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
                className="text-[13px] font-semibold text-brand-accent hover:underline"
              >
                {isForgotPassword
                  ? 'Quay lại đăng nhập'
                  : isRegister
                    ? 'Đã có tài khoản? Đăng nhập'
                    : 'Chưa có tài khoản? Đăng ký'}
              </button>
            </div>
          </div>
        </section>
      </Card>
    </div>
  );
};
