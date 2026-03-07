import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const err = searchParams.get('error');
    if (err) {
      setError(decodeURIComponent(err));
      return;
    }
    if (token) {
      localStorage.setItem('auth_token', token);
      navigate('/app/dashboard', { replace: true });
    } else {
      setError('Missing token');
    }
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center text-slate-300">
          <p className="text-rose-400 mb-4">{error}</p>
          <a href="/#/login" className="text-cyan-500 hover:underline">Return to login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-cyan-500">Signing you in...</div>
    </div>
  );
};

export default AuthCallback;
