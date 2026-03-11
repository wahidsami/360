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
        className={`glass-card bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl p-6 ${className}`}
        {...props}
    >
        {title && <h3 className="glass-card-title text-lg font-semibold text-white mb-4 border-b border-slate-700/50 pb-2">{title}</h3>}
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
    const baseStyles = "inline-flex items-center justify-center font-medium transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
        primary: "bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/20",
        secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700",
        ghost: "bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white",
        danger: "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20",
        outline: "bg-transparent hover:bg-slate-800 text-slate-200 border border-slate-600"
    };

    const sizes = {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 py-2 text-sm",
        lg: "h-12 px-6 text-base"
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
        className={`w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-cyan-400 font-bold ${className}`}
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
}

export const Badge = ({ children, variant = 'neutral', size = 'md', className = '', ...props }: BadgeProps) => {
    const variants = {
        success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        danger: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        info: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
        neutral: "bg-slate-500/10 text-slate-400 border-slate-500/20"
    };

    const sizes = {
        sm: "px-1.5 py-0.5 text-[10px]",
        md: "px-2 py-0.5 text-xs"
    };

    return (
        <span className={`inline-flex items-center rounded font-medium border ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
            {children}
        </span>
    );
};

// --- Form Elements ---
export const Label = (props: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label className={`block text-xs font-medium text-slate-400 mb-1.5 ${props.className || ''}`} {...props}>
        {props.children}
    </label>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    id?: string;
    name?: string;
    className?: string;
}

export const Input = ({ label, className = '', id, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => {
    return (
        <div className="space-y-1 w-full text-left">
            {label && <Label htmlFor={id}>{label}</Label>}
            <input
                id={id}
                className={`flex h-10 w-full rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
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
                className={`flex min-h-[80px] w-full rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
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
                    className={`flex h-10 w-full rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 appearance-none ${className}`}
                    {...props}
                >
                    {children}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <GlassCard className="p-5">
        <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-slate-400">{label}</h3>
            {icon && <div className="text-cyan-400">{icon}</div>}
        </div>
        <div className="flex items-end gap-2">
            <div className="text-2xl font-bold text-white">{value}</div>
            {trend !== undefined && (
                <span className={`text-xs font-medium mb-1 ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className={`bg-slate-900 border border-slate-700 rounded-xl w-full ${maxWidth} ${className} shadow-2xl relative max-h-[90vh] overflow-y-auto`}>
                <div className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
                    <h2 className="text-lg font-semibold text-white">{title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        ✕
                    </button>
                </div>
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>
    );
};

// --- ProgressBar ---
export const ProgressBar = ({ progress, className = '' }: { progress: number; className?: string }) => (
    <div className={`h-2 bg-slate-700 rounded-full overflow-hidden ${className}`}>
        <div
            className="h-full bg-cyan-500 transition-all duration-300"
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
