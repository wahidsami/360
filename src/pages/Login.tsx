import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { api } from '../services/api';

const Login: React.FC = () => {
  const { t } = useTranslation();
  const { login, loginWith2fa } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('admin@nebula.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [orgSlug, setOrgSlug] = useState('');
  const [publicOrg, setPublicOrg] = useState<{
    name: string; logo: string | null; primaryColor: string | null;
    accentColor: string | null; slug: string; sso: { saml: boolean; google: boolean }
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step2fa, setStep2fa] = useState<string | null>(null);
  const [code2fa, setCode2fa] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const err = searchParams.get('error');
    if (err) setError(decodeURIComponent(err));
    const org = searchParams.get('org');
    if (org) setOrgSlug(org);
  }, [searchParams]);

  useEffect(() => {
    if (!orgSlug.trim()) { setPublicOrg(null); return; }
    let cancelled = false;
    api.public.getOrgBySlug(orgSlug.trim())
      .then((data) => { if (!cancelled) setPublicOrg(data ?? null); })
      .catch(() => { if (!cancelled) setPublicOrg(null); });
    return () => { cancelled = true; };
  }, [orgSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      await login(email, password);
      navigate('/app/dashboard');
    } catch (err: any) {
      if (err.requires2fa && err.challenge) { setStep2fa(err.challenge); setError(null); }
      else setError(err.message || 'Authentication failed');
    } finally { setLoading(false); }
  };

  const handle2faSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!step2fa || !code2fa.trim()) return;
    setLoading(true); setError(null);
    try {
      await loginWith2fa(step2fa, code2fa.trim());
      navigate('/app/dashboard');
    } catch (err: any) { setError(err.message || 'Invalid code'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ===== LEFT PANE — Clean form ===== */}
      <div
        className="flex-1 flex flex-col justify-between min-h-screen bg-white dark:bg-slate-950 px-8 py-10 lg:px-16 xl:px-24"
        style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(12px)', transition: 'opacity .7s ease, transform .7s ease' }}
      >

        {/* Top: Logo */}
        <div className="flex items-center gap-3">
          <img src="/arenalogo.png" className="w-10 h-10 object-contain" alt="Arena 360" />
          <span className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
            {publicOrg?.name ?? 'Arena 360'}
          </span>
        </div>

        {/* Middle: Form */}
        <div className="w-full max-w-sm mx-auto lg:mx-0">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            {step2fa ? 'Two-Factor Verification' : t('login_title') || 'Sign in'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
            {step2fa ? 'Enter the 6-digit code from your authenticator.' : 'Enter your credentials to access the platform.'}
          </p>

          {error && (
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-3.5 text-sm text-rose-600 dark:text-rose-400 font-medium mb-6">
              {error}
            </div>
          )}

          {step2fa ? (
            <form onSubmit={handle2faSubmit} className="space-y-5">
              <input
                type="text" inputMode="numeric" autoComplete="one-time-code"
                value={code2fa}
                onChange={(e) => setCode2fa(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full h-14 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 text-center text-3xl font-extrabold tracking-[0.35em] text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                placeholder="000000" maxLength={6}
              />
              <button type="submit" disabled={loading || code2fa.length !== 6}
                className="w-full h-12 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50">
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              <button type="button" onClick={() => { setStep2fa(null); setCode2fa(''); setError(null); }}
                className="w-full text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                &larr; Back to login
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  placeholder="you@company.com"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
                  <a href="/forgot-password" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Forgot Password</a>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                    className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-11 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    placeholder="••••••"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full h-12 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 mt-2">
                {loading ? 'Signing in...' : t('enter_system') || 'Sign in'}
              </button>
            </form>
          )}
        </div>

        {/* Bottom: Powered By */}
        <div className="flex items-center justify-center lg:justify-start">
          <img src="/poweredby.png" className="h-6 opacity-40 dark:opacity-25 dark:invert" alt="Powered By" />
        </div>
      </div>

      {/* ===== RIGHT PANE — Dark branding ===== */}
      <div className="hidden lg:flex lg:w-[48%] relative items-center justify-center overflow-hidden bg-[#0b0f19] rounded-l-[2.5rem]">

        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full opacity-40"
            style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)', filter: 'blur(100px)', animation: 'brandFloat 12s ease-in-out infinite' }}
          />
          <div
            className="absolute bottom-[-15%] left-[-5%] w-[60%] h-[60%] rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)', filter: 'blur(100px)', animation: 'brandFloat 15s ease-in-out infinite reverse' }}
          />
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px)', backgroundSize: '60px 60px' }}
          />
        </div>

        {/* Brand content */}
        <div
          className="relative z-10 text-center px-12 max-w-lg"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(20px)', transition: 'opacity .9s ease .3s, transform .9s ease .3s' }}
        >
          {/* Large logo */}
          <div className="w-28 h-28 mx-auto mb-10 rounded-3xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] flex items-center justify-center shadow-2xl">
            <img src="/arenalogo.png" className="w-20 h-20 object-contain" alt="Arena 360" />
          </div>

          <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest mb-3">
            {publicOrg?.name ?? 'Arena 360'}
          </p>
          <h2 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Welcome to<br />{publicOrg?.name ?? 'Arena 360'}
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
            {t('login_subtitle') || 'Your unified platform for project management, compliance, and operational intelligence.'}
          </p>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes brandFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-15px, 15px) scale(1.04); }
        }
      `}</style>
    </div>
  );
};

export default Login;
