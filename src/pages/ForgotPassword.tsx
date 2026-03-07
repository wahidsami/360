import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/UIComponents';
import { Mail } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      await api.auth.forgotPassword(trimmed);
      setSubmitted(true);
    } catch (err) {
      // API may still return 200 with generic message; toast is shown by fetchApi on non-ok
      if (!submitted) toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-700 rounded-2xl p-8 text-center">
          <Mail className="w-12 h-12 text-cyan-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-slate-400 text-sm mb-6">
            If an account exists for this email, we sent a password reset link. It expires in 1 hour.
          </p>
          <Link to="/login">
            <Button>Back to login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-700 rounded-2xl p-8">
        <Mail className="w-12 h-12 text-cyan-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2 text-center">Forgot password</h2>
        <p className="text-slate-400 text-sm mb-6 text-center">
          Enter your email and we’ll send you a link to reset your password.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            autoComplete="email"
            disabled={loading}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Sending…' : 'Send reset link'}
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

export default ForgotPassword;
