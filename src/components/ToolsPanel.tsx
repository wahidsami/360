import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Role } from '../types';
import { TOOLS_REGISTRY } from '../config/toolRegistry';
import { GlassCard } from '@/components/ui/UIComponents';

interface ToolsPanelProps {
  role: Role;
}

export const ToolsPanel: React.FC<ToolsPanelProps> = ({ role }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const accessibleTools = TOOLS_REGISTRY.filter(tool => tool.roles.includes(role));

  if (accessibleTools.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white font-display">{t('tools')}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {accessibleTools.map(tool => (
          <GlassCard
            key={tool.id}
            className="cursor-pointer hover:bg-slate-800/60 hover:border-cyan-500/30 transition-all p-4 group"
            onClick={() => navigate(tool.path)}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-3 rounded-full bg-slate-800/50 group-hover:bg-cyan-900/20 text-cyan-400 transition-colors">
                <tool.icon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-slate-200 group-hover:text-white">{t(tool.titleKey)}</span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};
