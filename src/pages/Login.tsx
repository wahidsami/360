import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/UIComponents';
import { Shield, Zap, Users, TrendingUp, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';

const features = [
  { icon: Shield, label: 'Enterprise Security', desc: 'SOC2 compliant end-to-end encryption' },
  { icon: Zap,    label: 'Real-time Insights', desc: 'Live dashboards & instant reporting' },
  { icon: Users,  label: '500+ Teams',          desc: 'Trusted by global enterprise clients' },
  { icon: TrendingUp, label: '99.9% Uptime',    desc: 'Mission-critical reliability' },
];

const Login: React.FC = () => {
  const { t } = useTranslation();
  const { login, loginWith2fa } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail]       = useState('admin@nebula.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [orgSlug, setOrgSlug]   = useState('');
  const [publicOrg, setPublicOrg] = useState<{
    name: string; logo: string | null; primaryColor: string | null;
    accentColor: string | null; slug: string; sso: { saml: boolean; google: boolean }
  } | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [step2fa, setStep2fa]   = useState<string | null>(null);
  const [code2fa, setCode2fa]   = useState('');
  const [mounted, setMounted]   = useState(false);

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
    <div
      className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden font-sans"
      style={
        publicOrg?.primaryColor || publicOrg?.accentColor
          ? { ['--brand-primary' as string]: publicOrg.primaryColor || undefined, ['--brand-accent' as string]: publicOrg.accentColor || undefined }
          : undefined
      }
    >
      {/* ===== LEFT PANE ===== */}
      <div className="hidden lg:flex lg:w-[52%] relative items-center justify-center overflow-hidden bg-[#0a0e1a]">

        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-60"
            style={{
              background: 'radial-gradient(circle, #6366f1 0%, #4f46e5 40%, transparent 70%)',
              filter: 'blur(80px)',
              animation: 'float 8s ease-in-out infinite',
            }}
          />
          <div
            className="absolute bottom-[-10%] right-[-5%] w-[55%] h-[55%] rounded-full opacity-50"
            style={{
              background: 'radial-gradient(circle, #06b6d4 0%, #0891b2 40%, transparent 70%)',
              filter: 'blur(80px)',
              animation: 'float 10s ease-in-out infinite reverse',
            }}
          />
          <div
            className="absolute top-[40%] right-[10%] w-[35%] h-[35%] rounded-full opacity-30"
            style={{
              background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)',
              filter: 'blur(60px)',
              animation: 'pulse 6s ease-in-out infinite',
            }}
          />
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
              backgroundSize: '48px 48px',
            }}
          />
        </div>

        {/* Content */}
        <div
          className="relative z-10 px-14 xl:px-20 w-full max-w-xl"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.9s ease, transform 0.9s ease' }}
        >
          {/* Logo + Brand */}
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl">
                <img src="/arenalogo.png" className="w-10 h-10 object-contain" alt="Arena 360" />
              </div>
              <div>
                <h2 className="text-white text-xl font-black tracking-tight leading-none">{publicOrg?.name ?? 'Arena 360'}</h2>
                <p className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mt-0.5">Enterprise Platform</p>
              </div>
            </div>

            <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight mb-4">
              The future of<br />
              <span style={{ background: 'linear-gradient(135deg, #818cf8, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                enterprise security
              </span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              Unified intelligence platform for project governance, compliance, and real-time operational insights.
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-3 mb-12">
            {features.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="p-4 rounded-2xl border border-white/[0.06] backdrop-blur-sm group"
                style={{ background: 'rgba(255,255,255,0.035)', transition: 'background 0.3s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.035)')}
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-indigo-400" />
                </div>
                <p className="text-white text-xs font-bold leading-tight mb-1">{label}</p>
                <p className="text-slate-500 text-[10px] leading-snug">{desc}</p>
              </div>
            ))}
          </div>

          {/* Powered By */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
            <img src="/poweredby.png" className="h-6 brightness-0 invert opacity-30 hover:opacity-60 transition-opacity duration-300" alt="Powered by" />
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
          </div>
        </div>
      </div>

      {/* ===== RIGHT PANE ===== */}
      <div className="flex-1 flex items-center justify-center min-h-screen relative bg-slate-50 dark:bg-[#0d1117]">
        {/* Subtle background for right pane */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-0 right-0 w-[50%] h-[50%] opacity-20 dark:opacity-10"
            style={{ background: 'radial-gradient(circle at 100% 0%, #6366f1 0%, transparent 60%)', filter: 'blur(60px)' }}
          />
          <div
            className="absolute bottom-0 left-0 w-[40%] h-[40%] opacity-10"
            style={{ background: 'radial-gradient(circle at 0% 100%, #06b6d4 0%, transparent 60%)', filter: 'blur(60px)' }}
          />
        </div>

        <div
          className="relative z-10 w-full max-w-md px-6 lg:px-0 py-12"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(32px)', transition: 'opacity 0.9s ease 0.2s, transform 0.9s ease 0.2s' }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-10">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center">
              <img src="/arenalogo.png" className="w-7 h-7 object-contain" alt="Arena 360" />
            </div>
            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Arena 360</span>
          </div>

          {/* Card */}
          <div
            className="bg-white dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-white/[0.06] p-8 lg:p-10"
            style={{ boxShadow: '0 25px 60px -12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)' }}
          >
            {/* Header */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-4 border border-indigo-100/80 dark:border-indigo-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse inline-block" />
                Secure Access
              </div>
              <h2 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {step2fa ? 'Two-Factor Auth' : t('login_title') || 'Welcome back'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5">
                {step2fa ? 'Enter the 6-digit code from your authenticator app.' : 'Sign in to your workspace to continue.'}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-4 text-sm text-rose-600 dark:text-rose-400 text-center font-semibold mb-6 animate-in slide-in-from-top-2 duration-300">
                {error}
              </div>
            )}

            {step2fa ? (
              <form onSubmit={handle2faSubmit} className="space-y-6">
                <input
                  type="text" inputMode="numeric" autoComplete="one-time-code"
                  value={code2fa}
                  onChange={(e) => setCode2fa(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/[0.08] rounded-2xl py-4 px-6 text-slate-900 dark:text-white text-center text-3xl font-black tracking-[0.4em] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  placeholder="000000" maxLength={6}
                />
                <Button type="submit" disabled={loading || code2fa.length !== 6} className="w-full h-14 text-base font-bold tracking-wide">
                  {loading ? 'Verifying…' : 'Confirm Identity'}
                </Button>
                <button type="button" onClick={() => { setStep2fa(null); setCode2fa(''); setError(null); }}
                  className="w-full text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  ← Back to login
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Email address</label>
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    className="w-full h-12 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/[0.08] rounded-xl px-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium"
                    placeholder="name@company.com"
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
                    <a href="/forgot-password" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">Forgot password?</a>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                      className="w-full h-12 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/[0.08] rounded-xl px-4 pr-12 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium"
                      placeholder="••••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Org slug (if needed) */}
                {orgSlug && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Workspace</label>
                    <input
                      type="text" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)}
                      className="w-full h-12 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/[0.08] rounded-xl px-4 text-slate-900 dark:text-white outline-none text-sm font-medium"
                      placeholder="your-workspace"
                    />
                  </div>
                )}

                {/* Submit */}
                <div className="pt-2">
                  <button
                    type="submit" disabled={loading}
                    className="w-full h-12 rounded-xl font-bold text-sm text-white transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] hover:shadow-lg hover:shadow-indigo-500/25"
                    style={{ background: loading ? '#6366f1' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #0891b2 100%)' }}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                        Authenticating…
                      </span>
                    ) : t('enter_system') || 'Sign In to Workspace'}
                  </button>
                </div>

                {/* Google SSO */}
                {orgSlug && publicOrg?.sso?.google && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-white/[0.06]" /></div>
                      <div className="relative flex justify-center"><span className="px-4 bg-white dark:bg-slate-900 text-xs text-slate-400 dark:text-slate-600 font-semibold">or continue with</span></div>
                    </div>
                    <a
                      href={`${api.getBaseUrl()}/auth/sso/google?org=${encodeURIComponent(orgSlug)}`}
                      className="flex items-center justify-center gap-3 w-full h-12 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      Sign in with Google
                    </a>
                  </>
                )}
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <span className="text-[10px] text-slate-400 dark:text-slate-600 font-semibold uppercase tracking-widest">End-to-end encrypted</span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="text-[10px] text-slate-400 dark:text-slate-600 font-semibold uppercase tracking-widest">SOC2 Certified</span>
            </div>
            <img src="/poweredby.png" className="h-5 mx-auto opacity-30 dark:opacity-20 grayscale hover:grayscale-0 hover:opacity-70 transition-all duration-300" alt="Powered By" />
          </div>
        </div>
      </div>

      {/* Global animation keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -20px) scale(1.05); }
          66% { transform: translate(-15px, 15px) scale(0.97); }
        }
      `}</style>
    </div>
  );
};

export default Login;
