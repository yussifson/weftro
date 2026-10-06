import React from 'react';
import { AlertTriangle, RefreshCcw} from 'lucide-react';
import { Button} from '@/components/ui/button';
import i18n from '../i18n/config';

export class ErrorBoundary extends React.Component {
 constructor(props) {
 super(props);
 this.state = { hasError: false, error: null, errorInfo: null};
}

 static getDerivedStateFromError(error) {
 // Update state so the next render will show the fallback UI.
 return { hasError: true};
}

 componentDidCatch(error, errorInfo) {
 // You can also log the error to an error reporting service here (e.g., Sentry)
 console.error("Uncaught error:", error, errorInfo);
 this.setState({ error, errorInfo});
}

 render() {
 if (this.state.hasError) {
 // You can render any custom fallback UI
 return (
 <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-background p-6 font-sans">
 <div className="max-w-md w-full bg-white dark:bg-card border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 rounded-3xl p-8 text-center -emerald-900/5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
 <div className="w-20 h-20 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 ">
 <AlertTriangle className="w-10 h-10" />
 </div>
 <h1 className="text-3xl font-black text-slate-900 dark:text-foreground tracking-tight mb-4 tracking-[-0.02em]">
 {i18n.t("oops_something_went_wrong", "Oops! Something went wrong.")}
 </h1>
 <p className="text-slate-600 dark:text-muted-foreground font-medium leading-relaxed mb-8">
 {i18n.t(
 "we_encountered_an_unexpected_e",
 "We encountered an unexpected error. Please refresh the page or try again later."
 )}
 </p>
 
 {/* Optional: Show error details only in development */}
 {import.meta.env.DEV && this.state.error && (
 <div className="text-left bg-red-50 p-4 rounded-xl mb-8 overflow-auto max-h-40 border-[0.5px] border-black/9 dark:border-white/8 border-red-100">
 <p className="text-sm font-mono text-red-800 font-semibold mb-2">{this.state.error.toString()}</p>
 <pre className="text-xs font-mono text-red-600/80 tracking-[0.04em]">{this.state.errorInfo?.componentStack}</pre>
 </div>
 )}

 <Button 
 onClick={() => window.location.reload()}
 className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl py-6 font-semibold text-lg -emerald-600/20"
 >
 <RefreshCcw className="w-5 h-5 mr-2" />
 {i18n.t("refresh_page", "Refresh Page")}
 </Button>
 </div>
 </div>
 );
}

 return this.props.children; 
}
}
