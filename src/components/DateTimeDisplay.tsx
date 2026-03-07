import React, { useState, useEffect } from 'react';
import { Clock as ClockIcon, Calendar as CalendarIcon, Moon } from 'lucide-react';

export const DateTimeDisplay: React.FC = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    };

    const formatGregorianDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div className="flex items-center gap-4 px-5 py-2 rounded-2xl border border-cyan-500/30 bg-slate-900/60 backdrop-blur-xl shadow-[0_0_20px_rgba(6,182,212,0.1)] group hover:border-cyan-500/50 transition-all duration-300">
            <div className="flex flex-col items-center justify-center p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20 group-hover:bg-cyan-500/20 transition-colors">
                <Moon className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform duration-500" />
            </div>

            <div className="flex flex-col">
                <div className="flex items-center gap-2 text-cyan-400">
                    <ClockIcon className="w-3.5 h-3.5 opacity-70" />
                    <span className="text-sm font-black tracking-widest font-mono bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                        {formatTime(time)}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 mt-1 text-slate-400 text-[10px] font-bold tracking-tight uppercase">
                    <CalendarIcon className="w-3 h-3 text-slate-500" />
                    <span>{formatGregorianDate(time)}</span>
                </div>
            </div>
        </div>
    );
};
