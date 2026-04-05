import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/UIComponents';
import { KeyRound } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      toast.error('Invalid reset link. Please request a new one.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.auth.resetPassword(token, newPassword);
      setSuccess(true);
    } catch {
      // Error toast is shown by fetchApi
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-700 rounded-2xl p-8 text-center">
          <KeyRound className="w-12 h-12 text-cyan-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Password reset</h2>
          <p className="text-slate-400 text-sm mb-6">
            Your password has been reset. You can now log in with your new password.
          </p>
          <Link to="/login">
            <Button>Go to login</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-700 rounded-2xl p-8 text-center">
          <KeyRound className="w-12 h-12 text-[hsl(var(--brand-warning))] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Invalid link</h2>
          <p className="text-slate-400 text-sm mb-6">
            This reset link is missing the token. Please use the link from your email or request a new one.
          </p>
          <Link to="/forgot-password">
            <Button>Request new link</Button>
          </Link>
          <p className="mt-4">
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 text-sm">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-700 rounded-2xl p-8">
        <KeyRound className="w-12 h-12 text-cyan-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2 text-center">Set new password</h2>
        <p className="text-slate-400 text-sm mb-6 text-center">
          Enter your new password below.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            autoComplete="new-password"
            minLength={8}
            disabled={loading}
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            autoComplete="new-password"
            disabled={loading}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Resetting…' : 'Reset password'}
          </Button>
        </form>
        <p className="mt-6 text-center">
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300 text-sm">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
