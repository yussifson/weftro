import { useSubscription } from './useSubscription';

export function usePaywall() {
  const { plan, hasFeature, isLoading, isActive, checkLimit } = useSubscription();

  const isProOrAbove = plan?.name === 'Professional' || plan?.name === 'Enterprise' || plan?.name === 'Off-Cloud';

  return {
    isProOrAbove,
    hasFeature,
    isLoading,
    isActive,
    checkLimit
  };
}