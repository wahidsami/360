import React from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, FileText, AlertCircle, CheckSquare } from 'lucide-react';
import { GlassCard } from '../ui/UIComponents';
import { ActivityLog } from '../../types';
import { formatDistanceToNow } from 'date-fns';

interface ActivityTabProps {
  activity: ActivityLog[];
  onRefresh?: () => void;
}

const iconByType = (type?: string) => {
  switch (type) {
    case 'task': return <CheckSquare className="w-4 h-4 text-cyan-500" />;
    case 'finding': return <AlertCircle className="w-4 h-4 text-amber-500" />;
    case 'file': return <FileText className="w-4 h-4 text-slate-400" />;
    default: return <Activity className="w-4 h-4 text-slate-500" />;
  }
};

export const ActivityTab: React.FC<ActivityTabProps> = ({ activity }) => {
  const { t } = useTranslation();

  if (activity.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <Activity className="w-12 h-12 mx-auto text-slate-500 mb-4" />
        <p className="text-slate-500">{t('no_activity_stream')}</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      <GlassCard>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-500" />
          {t('activity_tab')}
        </h3>
        <ul className="space-y-0 divide-y divide-slate-800">
          {activity.map((item) => (
            <li key={item.id} className="flex gap-4 py-4 first:pt-0">
              <div className="flex-shrink-0 mt-0.5">
                {iconByType(item.type)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-slate-200">{item.description}</p>
                <p className="text-sm text-slate-500 mt-1">
                  {item.userName}
                  <span className="mx-2">·</span>
                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
};
