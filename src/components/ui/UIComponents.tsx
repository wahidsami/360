import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

// --- GlassCard ---
interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    title?: string;
    className?: string;
    onClick?: React.MouseEventHandler<HTMLDivElement>;
    key?: React.Key;
}

export const GlassCard = ({ children, className = '', title, ...props }: GlassCardProps) => (
    <div
        className={`glass-card bg-white dark:bg-slate-900 shadow-sm dark:shadow-none border border-slate-200/60 dark:border-slate-800/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl dark:hover:shadow-cyan-500/5 hover:-translate-y-1 ${className}`}
        {...props}
    >
        {title && <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-100 dark:border-slate-800 pb-3 tracking-tight">{title}</h3>}
        {children}
    </div>
);

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children?: React.ReactNode;
    className?: string;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    title?: string;
}

export const Button = ({ children, variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) => {
    const baseStyles = "inline-flex items-center justify-center font-bold tracking-tight transition-all duration-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/40 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
        primary: "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/20 dark:shadow-none",
        secondary: "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-200 border border-slate-200 dark:border-slate-700",
        ghost: "bg-transparent hover:bg-cyan-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-white",
        danger: "bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 dark:shadow-none",
        outline: "bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600"
    };

    const sizes = {
        sm: "h-9 px-4 text-xs",
        md: "h-11 px-6 py-2 text-sm",
        lg: "h-14 px-8 text-base"
    };

    return (
        <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} hover:scale-105 hover:shadow-xl active:scale-95 ${className}`} {...props}>
            {children}
        </button>
    );
};

// --- Avatar ---
interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
}

export const Avatar = ({ children, className = '', ...props }: AvatarProps) => (
    <div
        className={`w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-cyan-400 font-bold shadow-inner ${className}`}
        {...props}
    >
        {children}
    </div>
);

// --- Badge ---
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    children: React.ReactNode;
    className?: string;
    variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
    size?: 'sm' | 'md';
    key?: React.Key;
    pulse?: boolean;
}

export const Badge = ({ children, variant = 'neutral', size = 'md', className = '', pulse = false, ...props }: BadgeProps) => {
    const variants = {
        success: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
        warning: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
        danger: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20",
        info: "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20",
        neutral: "bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-500/20"
    };

    const sizes = {
        sm: "px-2 py-0.5 text-[10px]",
        md: "px-2.5 py-1 text-xs"
    };

    return (
        <span className={`inline-flex items-center rounded-full font-semibold border ${variants[variant]} ${sizes[size]} ${pulse ? 'animate-pulse-subtle' : ''} ${className}`} {...props}>
            {children}
        </span>
    );
};

// --- Form Elements ---
export const Label = (props: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label className={`block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2 ${props.className || ''}`} {...props}>
        {props.children}
    </label>
);

export const Input = ({ label, className = '', id, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => {
    return (
        <div className="space-y-1 w-full text-left">
            {label && <Label htmlFor={id}>{label}</Label>}
            <input
                id={id}
                className={`flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/30 px-4 py-2 text-sm text-slate-700 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all ${className}`}
                {...props}
            />
        </div>
    );
};

export const TextArea = ({ label, className = '', id, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) => {
    return (
        <div className="space-y-1 w-full text-left">
            {label && <Label htmlFor={id}>{label}</Label>}
            <textarea
                id={id}
                className={`flex min-h-[100px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/30 px-4 py-3 text-sm text-slate-700 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all ${className}`}
                {...props}
            />
        </div>
    );
};

export const Select = ({ label, className = '', id, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) => {
    return (
        <div className="space-y-1 w-full text-left">
            {label && <Label htmlFor={id}>{label}</Label>}
            <div className="relative">
                <select
                    id={id}
                    className={`flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/30 px-4 py-2 text-sm text-slate-700 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 appearance-none transition-all ${className}`}
                    {...props}
                >
                    {children}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </div>
            </div>
        </div>
    );
};

// --- KpiCard ---
interface KpiCardProps {
    label: string;
    value: string | number | React.ReactNode;
    trend?: string | number;
    trendUp?: boolean;
    icon?: React.ReactNode;
    compact?: boolean;
    className?: string;
    helperText?: string;
}

export const KpiCard = ({ label, value, trend, trendUp, icon, compact = false, className = '', helperText }: KpiCardProps) => (
    <div className={`group relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 shadow-sm hover:shadow-xl dark:hover:shadow-cyan-500/5 transition-all duration-300 hover:-translate-y-1 ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/40 via-transparent to-blue-50/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <div className={`relative z-10 ${compact ? 'p-4 md:p-5' : 'p-6'}`}>
            <div className={`flex justify-between items-start ${compact ? 'mb-3' : 'mb-4'}`}>
                <h3 className={`${compact ? 'text-[11px]' : 'text-xs'} font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest`}>{label}</h3>
                {icon && (
                    <div className={`${compact ? 'p-2.5' : 'p-3'} bg-gradient-to-br from-cyan-400 to-blue-500 dark:from-cyan-500/20 dark:to-blue-600/20 rounded-xl text-white dark:text-cyan-400 shadow-md group-hover:shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                        {icon}
                    </div>
                )}
            </div>
            <div className={`flex items-end ${compact ? 'gap-2' : 'gap-3'}`}>
                <div className={`${compact ? 'text-3xl md:text-[2rem]' : 'text-4xl'} font-black text-slate-900 dark:text-white tracking-tight leading-none`}>{value}</div>
                {trend !== undefined && (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm ${trendUp ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {trendUp ? '+' : '-'} {trend}
                    </span>
                )}
            </div>
            {helperText && (
                <p className={`mt-2 ${compact ? 'text-[11px]' : 'text-xs'} font-medium text-slate-500 dark:text-slate-400`}>
                    {helperText}
                </p>
            )}
        </div>
    </div>
);

// --- Modal ---
export const Modal = ({ isOpen, onClose, title, children, className = '', maxWidth = 'max-w-lg' }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; className?: string; maxWidth?: string }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-300">
            <div className={`bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/50 rounded-2xl w-full ${maxWidth} ${className} shadow-2xl relative max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300`}>
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/50 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h2>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full transition-all">
                        ✕
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                    {children}
                </div>
            </div>
        </div>
    );
};

// --- ProgressBar ---
export const ProgressBar = ({ progress, className = '' }: { progress: number; className?: string }) => (
    <div className={`h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ${className}`}>
        <div
            className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
    </div>
);

// --- CopyButton ---
export const CopyButton = ({ value, className = '' }: { value: string; className?: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className={`p-1 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded transition-colors inline-flex items-center justify-center ${className}`}
            title="Copy ID"
        >
            {copied ? (
                <Check className="w-3 h-3 text-emerald-400 animate-in zoom-in duration-200" />
            ) : (
                <Copy className="w-3 h-3 text-slate-500 hover:text-cyan-400" />
            )}
        </button>
    );
};
