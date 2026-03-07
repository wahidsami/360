import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Building2, FolderPlus, UserPlus, X } from 'lucide-react';
import { Button } from '../components/ui/UIComponents';
import { api } from '../services/api';

type OnboardingStatus = {
  completed: boolean;
  steps: { profile: boolean; firstProject: boolean; inviteMember: boolean };
};

export const OnboardingWizard: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState(false);

  const load = async () => {
    try {
      const s = await api.org.getOnboardingStatus();
      setStatus(s);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await api.org.dismissOnboarding();
      await load();
    } finally {
      setDismissing(false);
    }
  };

  if (loading || !status || status.completed) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Welcome to Arena360</h2>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={dismissing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-slate-400 text-sm">Complete these steps to get the most out of your workspace.</p>

          <div className="space-y-3">
            <div className={`flex items-center gap-3 p-3 rounded-lg ${status.steps.profile ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-slate-800/50 border border-slate-700'}`}>
              {status.steps.profile ? (
                <Check className="w-5 h-5 text-cyan-500 shrink-0" />
              ) : (
                <Building2 className="w-5 h-5 text-slate-500 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white">1. Set organization profile</p>
                <p className="text-sm text-slate-400">Add your org name, slug, and branding.</p>
              </div>
              {!status.steps.profile && (
                <Button size="sm" onClick={() => navigate('/app/settings')}>
                  Open Settings
                </Button>
              )}
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg ${status.steps.firstProject ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-slate-800/50 border border-slate-700'}`}>
              {status.steps.firstProject ? (
                <Check className="w-5 h-5 text-cyan-500 shrink-0" />
              ) : (
                <FolderPlus className="w-5 h-5 text-slate-500 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white">2. Create your first project</p>
                <p className="text-sm text-slate-400">Create a project (add a client first if needed).</p>
              </div>
              {!status.steps.firstProject && (
                <Button size="sm" onClick={() => navigate('/app/projects/new')}>
                  Create Project
                </Button>
              )}
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg ${status.steps.inviteMember ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-slate-800/50 border border-slate-700'}`}>
              {status.steps.inviteMember ? (
                <Check className="w-5 h-5 text-cyan-500 shrink-0" />
              ) : (
                <UserPlus className="w-5 h-5 text-slate-500 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white">3. Invite a team member</p>
                <p className="text-sm text-slate-400">Add a user or send an invite from Admin → Users.</p>
              </div>
              {!status.steps.inviteMember && (
                <Button size="sm" onClick={() => navigate('/app/admin/users')}>
                  Invite User
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleDismiss}
              disabled={dismissing}
              className="text-sm text-slate-500 hover:text-slate-300"
            >
              {dismissing ? 'Dismissing…' : "I'll do this later"}
            </button>
            <Button
              onClick={async () => {
                await load();
              }}
            >
              Refresh status
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
