import React from 'react';
import { Finding } from '@/types';
import { FindingsList } from '../../pages/findings/FindingsList';

interface FindingsTabProps {
    findings: Finding[];
    projectId: string;
    onRefresh: () => void;
}

export const FindingsTab: React.FC<FindingsTabProps> = ({ findings, projectId, onRefresh }) => {
    return (
        <div className="space-y-6">
            <FindingsList initialFindings={findings} projectId={projectId} onRefresh={onRefresh} />
        </div>
    );
};
