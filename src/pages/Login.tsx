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
      className="min-h-screen bg-white flex flex-col lg:flex-row relative overflow-hidden font-sans"
      style={
        publicOrg?.primaryColor || publicOrg?.accentColor
          ? {
              ['--brand-primary' as string]: publicOrg.primaryColor || undefined,
              ['--brand-accent' as string]: publicOrg.accentColor || undefined,
            }
          : undefined
      }
    >
      {/* Left Pane: Sophisticated Gradient & Brand */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 items-center justify-center overflow-hidden">
        {/* Dynamic Background Elements */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-cyan-300/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-purple-400/20 rounded-full blur-[120px] animate-pulse delay-700" />
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay" />
        </div>

        <div className="relative z-10 px-16 text-center text-white space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
           <div className="w-28 h-28 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl transform hover:rotate-6 transition-transform duration-500">
              <Lock className="w-12 h-12 text-white drop-shadow-lg" />
           </div>
           
           <div className="space-y-6">
              <h1 className="text-6xl font-black tracking-tighter leading-none">{publicOrg?.name ?? 'Arena 360'}</h1>
              <p className="text-xl text-white/90 font-medium max-w-lg mx-auto leading-relaxed">
                {t('login_subtitle') || 'The operating system for modern enterprise security and intelligence.'}
              </p>
           </div>

           <div className="flex flex-col items-center gap-6 pt-12">
              <div className="flex -space-x-4">
                 {[1,2,3,4,5].map(i => (
                   <div key={i} className="w-12 h-12 rounded-full border-4 border-blue-600 bg-gradient-to-br from-slate-100 to-slate-300 flex items-center justify-center text-xs font-black text-slate-800 shadow-xl">
                     {String.fromCharCode(64 + i)}
                   </div>
                 ))}
              </div>
              <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <p className="text-xs font-black uppercase tracking-widest text-white/80">Systems Operational & Secure</p>
              </div>
           </div>
        </div>
      </div>

      {/* Right Pane: Clean Light Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 relative z-10 bg-slate-50/50">
        <div className="w-full max-w-md space-y-10">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-black text-slate-900 tracking-tighter">Arena 360</span>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-white border border-slate-200/60 rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] p-12 space-y-10 animate-in fade-in zoom-in-95 duration-700">
            <div className="text-center space-y-3">
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{t('login_title') || 'Welcome Back'}</h2>
              <p className="text-slate-500 text-sm font-medium">Please enter your credentials to proceed</p>
            </div>

            {step2fa ? (
               <form onSubmit={handle2faSubmit} className="space-y-8">
                {error && (
                  <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-sm text-rose-600 text-center font-bold animate-in slide-in-from-top-2">{error}</div>
                )}
                <div className="space-y-4 text-center">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Safety Verification Required</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code2fa}
                    onChange={(e) => setCode2fa(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-6 text-slate-900 text-center text-4xl font-black tracking-[0.4em] focus:border-cyan-500 focus:bg-white focus:ring-8 focus:ring-cyan-500/5 outline-none transition-all shadow-inner"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>
                <Button type="submit" disabled={loading || code2fa.length !== 6} className="w-full h-16 text-lg font-black uppercase tracking-widest shadow-xl hover:shadow-cyan-500/20">
                  {loading ? 'Authenticating...' : 'Confirm Identity'}
                </Button>
                <button type="button" onClick={() => { setStep2fa(null); setCode2fa(''); setError(null); }} className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
                  &larr; Use standard login
                </button>
              </form>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-sm text-rose-600 text-center font-bold animate-in slide-in-from-top-2">{error}</div>
              )}
              
              <div className="space-y-6">
                <div className="group space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-cyan-600 transition-colors">Workspace Access Identity</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 text-slate-900 focus:border-cyan-500 focus:bg-white focus:ring-8 focus:ring-cyan-500/5 outline-none transition-all font-bold text-base shadow-sm"
                    placeholder="name@company.com"
                    required
                  />
                </div>

                <div className="group space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-focus-within:text-cyan-600 transition-colors">Security Credentials</label>
                    <a href="/forgot-password" title="Recover Password" className="text-[10px] font-black text-cyan-600 hover:text-cyan-700 uppercase tracking-widest">Recovery?</a>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 text-slate-900 focus:border-cyan-500 focus:bg-white focus:ring-8 focus:ring-cyan-500/5 outline-none transition-all font-bold text-base shadow-sm"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={loading} className="w-full h-16 text-lg font-black uppercase tracking-widest shadow-xl hover:shadow-cyan-500/20">
                  {loading ? 'Processing...' : (t('enter_system') || 'Launch System')}
                </Button>
              </div>

              {(orgSlug || publicOrg?.sso?.google) && (
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100" />
                  </div>
                  <div className="relative flex justify-center text-[10px]">
                    <span className="px-6 bg-white text-slate-400 font-black tracking-[0.2em] uppercase">Enterprise Federation</span>
                  </div>
                </div>
              )}

              {orgSlug && publicOrg?.sso?.google && (
                <a
                  href={`${api.getBaseUrl()}/auth/sso/google?org=${encodeURIComponent(orgSlug)}`}
                  className="flex items-center justify-center gap-4 w-full h-14 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] shadow-sm"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Sign in with Google
                </a>
              )}
            </form>
            )}
          </div>

          {/* Footer Info */}
          <div className="flex items-center justify-center gap-6 text-slate-400">
             <div className="h-px flex-grow bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
             <div className="flex flex-col items-center">
               <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">System Core v2.4</span>
               <span className="text-[8px] font-bold text-cyan-600/50 uppercase tracking-widest mt-1">End-to-End Encrypted</span>
             </div>
             <div className="h-px flex-grow bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
