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
        className={`glass-card bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-soft-lg ${className}`}
        {...props}
    >
        {title && <h3 className="glass-card-title text-lg font-bold text-white mb-6 border-b border-slate-700/50 pb-3 tracking-tight">{title}</h3>}
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
    const baseStyles = "inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/40 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
        primary: "bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600 text-white shadow-lg shadow-cyan-500/25",
        secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700",
        ghost: "bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-white",
        danger: "bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20",
        outline: "bg-transparent hover:bg-slate-800/50 text-slate-200 border border-slate-600"
    };

    const sizes = {
        sm: "h-9 px-4 text-xs",
        md: "h-11 px-6 py-2 text-sm",
        lg: "h-14 px-8 text-base"
    };

    return (
        <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
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
        success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        danger: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        info: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
        neutral: "bg-slate-500/10 text-slate-400 border-slate-500/20"
    };

    const sizes = {
        sm: "px-2 py-0.5 text-[10px]",
        md: "px-2.5 py-1 text-xs"
    };

    return (
        <span className={`inline-flex items-center rounded-full font-bold border ${variants[variant]} ${sizes[size]} ${pulse ? 'animate-pulse-subtle' : ''} ${className}`} {...props}>
            {children}
        </span>
    );
};

// --- Form Elements ---
export const Label = (props: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label className={`block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ${props.className || ''}`} {...props}>
        {props.children}
    </label>
);

export const Input = ({ label, className = '', id, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => {
    return (
        <div className="space-y-1 w-full text-left">
            {label && <Label htmlFor={id}>{label}</Label>}
            <input
                id={id}
                className={`flex h-11 w-full rounded-xl border border-slate-700 bg-slate-950/30 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all ${className}`}
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
                className={`flex min-h-[100px] w-full rounded-xl border border-slate-700 bg-slate-950/30 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all ${className}`}
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
                    className={`flex h-11 w-full rounded-xl border border-slate-700 bg-slate-950/30 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 appearance-none transition-all ${className}`}
                    {...props}
                >
                    {children}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
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
}

export const KpiCard = ({ label, value, trend, trendUp, icon }: KpiCardProps) => (
    <GlassCard className="p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/5 to-transparent rounded-bl-full pointer-events-none transition-all group-hover:bg-cyan-500/10" />
        <div className="flex justify-between items-start mb-4 relative z-10">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</h3>
            {icon && <div className="p-2 bg-slate-800/50 rounded-lg text-cyan-400 group-hover:scale-110 transition-transform">{icon}</div>}
        </div>
        <div className="flex items-end gap-3 relative z-10">
            <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
            {trend !== undefined && (
                <span className={`text-xs font-bold mb-1 px-2 py-0.5 rounded-full ${trendUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {trendUp ? '↑' : '↓'} {trend}
                </span>
            )}
        </div>
    </GlassCard>
);

// --- Modal ---
export const Modal = ({ isOpen, onClose, title, children, className = '', maxWidth = 'max-w-lg' }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; className?: string; maxWidth?: string }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className={`bg-slate-900/90 border border-slate-700/50 rounded-2xl w-full ${maxWidth} ${className} shadow-2xl relative max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300`}>
                <div className="flex items-center justify-between p-6 border-b border-slate-700/50 sticky top-0 bg-slate-900/90 backdrop-blur-md z-10">
                    <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-slate-800/50 text-slate-400 hover:text-white rounded-full transition-all">
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
    <div className={`h-2.5 bg-slate-800 rounded-full overflow-hidden ${className}`}>
        <div
            className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-cyan-500 animate-shimmer"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundSize: '200% 100%' }}
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
            className={`p-1 hover:bg-slate-700 rounded transition-colors inline-flex items-center justify-center ${className}`}
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
