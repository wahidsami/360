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
      className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden"
      style={
        publicOrg?.primaryColor || publicOrg?.accentColor
          ? {
              ['--brand-primary' as string]: publicOrg.primaryColor || undefined,
              ['--brand-accent' as string]: publicOrg.accentColor || undefined,
            }
          : undefined
      }
    >
      {/* Background FX */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] animate-pulse delay-75" />
      </div>

      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl relative z-10 overflow-hidden -mt-10">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-cyan-500" />

        <div className="p-8 text-center">
          <div className="w-[130px] h-[65px] mx-auto flex items-center justify-center mb-6">
            {publicOrg?.logo ? (
              <img src={publicOrg.logo} alt={publicOrg.name} className="max-w-full max-h-full object-contain" />
            ) : (
              <img
                src="/arenalogo.png"
                alt="Arena logo"
                className="max-w-full max-h-full object-contain"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            )}
          </div>

          <h2 className="text-2xl font-bold text-white font-display tracking-wide">{publicOrg?.name ?? t('login_title')}</h2>
          <p className="text-slate-400 text-sm mt-2">{t('login_subtitle')}</p>
        </div>

        {step2fa ? (
          <form onSubmit={handle2faSubmit} className="p-8 pt-0 space-y-6">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-sm text-rose-200 text-center">{error}</div>
            )}
            <p className="text-slate-400 text-sm text-center">Enter the 6-digit code from your authenticator app.</p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Authentication code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code2fa}
                onChange={(e) => setCode2fa(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg py-3 px-4 text-slate-200 text-center text-lg tracking-widest focus:border-cyan-500 outline-none"
                placeholder="000000"
                maxLength={6}
              />
            </div>
            <Button type="submit" disabled={loading || code2fa.length !== 6} className="w-full py-3">
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
            <button type="button" onClick={() => { setStep2fa(null); setCode2fa(''); setError(null); }} className="w-full text-sm text-slate-500 hover:text-slate-300">
              Back to password
            </button>
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="p-8 pt-0 space-y-6">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-sm text-rose-200 text-center">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Organization slug (optional, for SSO)</label>
            <input
              type="text"
              value={orgSlug}
              onChange={(e) => setOrgSlug(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-700 rounded-lg py-2.5 px-4 text-slate-200 focus:border-cyan-500 outline-none text-sm"
              placeholder="e.g. acme"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Identity</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg py-3 px-4 text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                placeholder={t('email_placeholder')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Passcode</label>
              <a href="/forgot-password" className="text-xs text-cyan-500 hover:text-cyan-400">Forgot?</a>
            </div>
            <div className="relative">
              <Lock className="absolute right-3 top-3.5 w-4 h-4 text-slate-600" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg py-3 px-4 text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full py-3 text-lg shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            {loading ? 'Authenticating...' : t('enter_system')}
          </Button>

          {orgSlug && !step2fa && (
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-slate-900/40 text-slate-500">or</span>
              </div>
            </div>
          )}
          {orgSlug && publicOrg?.sso?.google && (
            <a
              href={`${api.getBaseUrl()}/auth/sso/google?org=${encodeURIComponent(orgSlug)}`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-700/50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </a>
          )}
          {orgSlug && publicOrg?.sso?.saml && (
            <a
              href={`${api.getBaseUrl()}/auth/sso/saml?org=${encodeURIComponent(orgSlug)}`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-700/50 transition-colors mt-2"
            >
              Sign in with SSO
            </a>
          )}

          <div className="text-center pt-2">
            <p className="text-xs text-slate-500">
              Arena OS v1.0b
            </p>
            <p className="text-xs text-slate-500 mt-1">
              <a href="/#/signup" className="text-cyan-500 hover:text-cyan-400">Create organization</a>
            </p>
          </div>
        </form>
        )}
      </div>

      {/* Page Footer */}
      <div className="absolute bottom-6 left-0 w-full flex justify-center z-10 opacity-70 hover:opacity-100 transition-opacity">
        <div className="max-w-[480px]">
          <img
            src="/poweredby.png"
            alt="Powered by"
            className="w-full h-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
};

export default Login;
