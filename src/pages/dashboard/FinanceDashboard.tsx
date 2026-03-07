import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, FileText, Briefcase, AlertTriangle } from 'lucide-react';
import { GlassCard, KpiCard, Badge } from '@/components/ui/UIComponents';
import { ToolsPanel } from '@/components/ToolsPanel';
import { api } from '@/services/api';
import { Role, Invoice } from '@/types';

export const FinanceDashboard: React.FC<{ role: Role }> = ({ role }) => {
   const { t } = useTranslation();
   const [stats, setStats] = useState<any>(null);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const load = async () => {
         const data = await api.dashboard.getFinanceStats();
         setStats(data);
         setLoading(false);
      };
      load();
   }, []);

   if (loading) return <div className="text-center p-10 text-slate-500">Loading Financial Data...</div>;

   return (
      <div className="space-y-8">
         <div>
            <h1 className="text-3xl font-bold font-display text-white">{t('dashboard')}</h1>
            <p className="text-slate-400 mt-1">Financial Overview & Accounts Receivable.</p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard label={t('outstanding_balance')} value={`$${(stats.outstanding / 1000).toFixed(1)}k`} trend={-5} icon={<DollarSign />} />
            <KpiCard label={t('invoices_due')} value={stats.invoicesDue} icon={<FileText />} />
            <KpiCard label={t('paid_this_month')} value={`$${(stats.paidThisMonth / 1000).toFixed(1)}k`} trend={10} icon={<Briefcase />} />
            <KpiCard label={t('active_contracts')} value={stats.activeContracts} icon={<Briefcase />} />
         </div>

         <ToolsPanel role={role} />

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard title={t('overdue_payments')}>
               <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                     <thead className="text-slate-500 border-b border-slate-700/50">
                        <tr>
                           <th className="pb-2">Invoice</th>
                           <th className="pb-2">Amount</th>
                           <th className="pb-2">Due Date</th>
                           <th className="pb-2">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-800">
                        {(stats.overdueInvoices as Invoice[]).map(inv => (
                           <tr key={inv.id}>
                              <td className="py-3 font-mono text-slate-300">{inv.reference}</td>
                              <td className="py-3 text-rose-400 font-bold">{inv.currency} {inv.amount.toLocaleString()}</td>
                              <td className="py-3 text-slate-400">{inv.dueDate}</td>
                              <td className="py-3"><Badge variant="danger">Overdue</Badge></td>
                           </tr>
                        ))}
                        {stats.overdueInvoices.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-slate-500">No overdue payments.</td></tr>}
                     </tbody>
                  </table>
               </div>
            </GlassCard>

            <GlassCard title="Recent Invoices">
               <div className="space-y-4">
                  {(stats.recentInvoices as Invoice[]).map(inv => (
                     <div key={inv.id} className="flex justify-between items-center p-2 rounded hover:bg-slate-800/30 transition-colors">
                        <div>
                           <p className="font-medium text-slate-200">{inv.reference}</p>
                           <p className="text-xs text-slate-500">{inv.issuedDate}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-slate-100">{inv.currency} {inv.amount.toLocaleString()}</p>
                           <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'sent' ? 'warning' : 'neutral'}>{inv.status}</Badge>
                        </div>
                     </div>
                  ))}
               </div>
            </GlassCard>
         </div>
      </div>
   );
};
