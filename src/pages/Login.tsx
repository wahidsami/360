import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/UIComponents';
import { Lock } from 'lucide-react';
import { api } from '../services/api';

const Login: React.FC = () => {
  const { t } = useTranslation();
  const { login, loginWith2fa } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('admin@nebula.com');
  const [password, setPassword] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [publicOrg, setPublicOrg] = useState<{ name: string; logo: string | null; primaryColor: string | null; accentColor: string | null; slug: string; sso: { saml: boolean; google: boolean } } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step2fa, setStep2fa] = useState<string | null>(null);
  const [code2fa, setCode2fa] = useState('');

  useEffect(() => {
    const err = searchParams.get('error');
    if (err) setError(decodeURIComponent(err));
    const org = searchParams.get('org');
    if (org) setOrgSlug(org);
  }, [searchParams]);

  useEffect(() => {
    if (!orgSlug.trim()) {
      setPublicOrg(null);
      return;
    }
    let cancelled = false;
    api.public.getOrgBySlug(orgSlug.trim()).then((data) => {
      if (!cancelled) setPublicOrg(data ?? null);
    }).catch(() => { if (!cancelled) setPublicOrg(null); });
    return () => { cancelled = true; };
  }, [orgSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/app/dashboard');
    } catch (err: any) {
      if (err.requires2fa && err.challenge) {
        setStep2fa(err.challenge);
        setError(null);
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handle2faSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!step2fa || !code2fa.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await loginWith2fa(step2fa, code2fa.trim());
      navigate('/app/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-50 flex flex-col lg:flex-row relative overflow-hidden theme-light"
      style={
        publicOrg?.primaryColor || publicOrg?.accentColor
          ? {
              ['--brand-primary' as string]: publicOrg.primaryColor || undefined,
              ['--brand-accent' as string]: publicOrg.accentColor || undefined,
            }
          : undefined
      }
    >
      {/* Left Pane: Decorative & Brand */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-cyan-500 via-indigo-600 to-purple-700 items-center justify-center overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0 text-white">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:40px_40px]" />
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-400/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-400/20 rounded-full blur-[120px] animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 px-12 text-center text-white space-y-8 animate-fade-in-up">
           <div className="w-24 h-24 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl mx-auto flex items-center justify-center shadow-2xl">
              <Lock className="w-10 h-10 text-white" />
           </div>
           <div className="space-y-4">
              <h1 className="text-5xl font-extrabold tracking-tight">{publicOrg?.name ?? 'Arena 360'}</h1>
              <p className="text-xl text-white/80 font-medium max-w-md mx-auto">
                {t('login_subtitle') || 'Secure enterprise infrastructure for modern security operations.'}
              </p>
           </div>
           <div className="flex items-center justify-center gap-6 pt-8">
              <div className="flex -space-x-3">
                 {[1,2,3,4].map(i => <div key={i} className="w-10 h-10 rounded-full border-2 border-indigo-600 bg-indigo-500 flex items-center justify-center text-xs font-bold">U{i}</div>)}
              </div>
              <p className="text-sm text-white/60">Trusted by 50+ security teams</p>
           </div>
        </div>
      </div>

      {/* Right Pane: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10 bg-[#F7F9FA]">
        <div className="w-full max-w-md space-y-8 animate-fade-in-up">
          <div className="lg:hidden text-center mb-10">
            <img src="/arenalogo.png" alt="Logo" className="h-10 mx-auto" />
          </div>

          <div className="bg-white border border-[#E4E9F2] rounded-3xl shadow-soft-xl p-10 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{t('login_title') || 'Welcome Back'}</h2>
              <p className="text-slate-500 text-sm font-medium">Log in to your workspace to continue</p>
            </div>

            {step2fa ? (
               <form onSubmit={handle2faSubmit} className="space-y-6">
                {error && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-sm text-rose-600 text-center font-medium animate-in slide-in-from-top-2">{error}</div>
                )}
                <div className="space-y-4 text-center">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Two-Factor Auth</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code2fa}
                    onChange={(e) => setCode2fa(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 px-6 text-slate-900 text-center text-3xl font-bold tracking-[0.5em] focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>
                <Button type="submit" disabled={loading || code2fa.length !== 6} className="w-full h-14 text-lg font-bold">
                  {loading ? 'Verifying...' : 'Complete Login'}
                </Button>
                <button type="button" onClick={() => { setStep2fa(null); setCode2fa(''); setError(null); }} className="w-full text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors">
                  Try another method
                </button>
              </form>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-sm text-rose-600 text-center font-medium animate-in slide-in-from-top-2">{error}</div>
              )}
              
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email Identity</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-900 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all font-medium"
                    placeholder="name@company.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Password</label>
                    <a href="/forgot-password" title="Recover Password" className="text-xs font-bold text-cyan-500 hover:text-cyan-600">Forgot?</a>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-900 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all font-medium"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={loading} className="w-full h-14 text-lg font-bold">
                  {loading ? 'Entering...' : (t('enter_system') || 'Sign In')}
                </Button>
              </div>

              {(orgSlug || publicOrg?.sso?.google) && (
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-4 bg-white text-slate-400 font-bold tracking-widest uppercase">Social SSO</span>
                  </div>
                </div>
              )}

              {orgSlug && publicOrg?.sso?.google && (
                <a
                  href={`${api.getBaseUrl()}/auth/sso/google?org=${encodeURIComponent(orgSlug)}`}
                  className="flex items-center justify-center gap-3 w-full h-13 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-all active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Continue with Google
                </a>
              )}
            </form>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 text-slate-400 opacity-60">
             <div className="h-px w-8 bg-slate-300" />
             <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Arena OS v1.0b</span>
             <div className="h-px w-8 bg-slate-300" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
