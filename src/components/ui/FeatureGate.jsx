import React, { useState} from 'react';
import { useSubscription} from '@/hooks/useSubscription';
import UpgradeModal from './UpgradeModal';
import { Lock} from 'lucide-react';

const FeatureGate = ({ featureName, limitName, children, fallback, fallbackType = 'hide'}) => {
 const { hasFeature, checkLimit, isActive, isLoading} = useSubscription();
 const [showUpgradeModal, setShowUpgradeModal] = useState(false);

 if (isLoading) return null;

 // Check if gated by a specific feature flag
 if (featureName && !hasFeature(featureName)) {
 if (fallbackType === 'hide') return fallback || null;
 if (fallbackType === 'disable') {
 return (
 <div className="relative group inline-block">
 <div className="opacity-50 pointer-events-none">{children}</div>
 <div className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer" onClick={() => setShowUpgradeModal(true)}>
 <Lock className="w-5 h-5 text-slate-500 dark:text-muted-foreground group-hover:text-primary transition-colors" />
 </div>
 {showUpgradeModal && <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} reason={`The ${featureName} feature requires a higher plan.`} />}
 </div>
 );
}
}

 // Check if gated by a quantitative limit (e.g. max users)
 if (limitName) {
 const limitStatus = checkLimit(limitName);
 if (!limitStatus.allowed) {
 if (fallbackType === 'hide') return fallback || null;
 if (fallbackType === 'disable') {
 return (
 <div className="relative group inline-block">
 <div className="opacity-50 pointer-events-none">{children}</div>
 <div className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer" onClick={() => setShowUpgradeModal(true)}>
 <Lock className="w-5 h-5 text-slate-500 dark:text-muted-foreground group-hover:text-primary transition-colors" />
 </div>
 {showUpgradeModal && <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} reason={`You have reached the limit for ${limitName} (${limitStatus.max}). Please upgrade to add more.`} />}
 </div>
 );
}
}
}

 return <>{children}</>;
};

export default FeatureGate;
