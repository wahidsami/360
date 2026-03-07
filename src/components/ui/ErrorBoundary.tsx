import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button, GlassCard } from "./UIComponents";

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                    <GlassCard className="max-w-md w-full text-center p-8 border-rose-500/30">
                        <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-rose-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Something went wrong</h2>
                        <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                            We encountered an unexpected error. Don't worry, your data is safe.
                            Try refreshing the page or navigating back home.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mb-8 p-3 bg-slate-800 rounded text-left overflow-auto max-h-32">
                                <p className="text-rose-400 font-mono text-xs whitespace-pre-wrap">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={() => window.location.reload()}
                                className="w-full"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" /> Refresh Page
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => window.location.href = '/'}
                                className="w-full"
                            >
                                <Home className="w-4 h-4 mr-2" /> Back to Home
                            </Button>
                        </div>
                    </GlassCard>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
