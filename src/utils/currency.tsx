import React from 'react';

// Currency utility helper for SAR
export const formatCurrency = (amount: number, currency: string = 'SAR'): string => {
    if (currency === 'SAR') {
        return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`;
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
};

// Component helper for displaying SAR - using a clean text fallback for stability
export const SarSymbol = () => {
    return <span className="text-cyan-500 font-bold mr-1">SAR</span>;
};

// Format amount with SAR symbol
export const formatSAR = (amount: number): React.ReactNode => {
    return (
        <span className="flex items-center">
            <span className="text-slate-400 text-sm font-normal mr-1.5">ر.س</span>
            <span>{amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </span>
    );
};
