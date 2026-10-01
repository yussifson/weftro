/**
 * API Index - Unified export of all Real Estate Management APIs
 * 
 * This file consolidates all API modules and provides a single entry point
 * for real estate operations including trust accounting, offers, documents,
 * contractors, lease automation, market intelligence, and analytics.
 */

export { RealEstateTrustAccounting } from './RealEstateTrustAccounting';
export { FirmAccountingAPI } from './FirmAccountingAPI';
export { RealEstateOffers } from './RealEstateOffers';
export { RealEstateDocuments } from './RealEstateDocuments';
export { RealEstateContractors } from './RealEstateContractors';
export { RealEstateLeaseAutomation } from './RealEstateLeaseAutomation';
export { RealEstateIntelligence } from './RealEstateIntelligence';
export { RealEstateAnalytics } from './RealEstateAnalytics';
export { powerSync } from './PowerSyncConnector';
export * as glEngine from './glEngine';

/**
 * Unified API client for real estate operations
 * Usage: import { RealEstateAPI } from '@/api'
 */
export const RealEstateAPI = {
  trust: async (operation, ...args) => {
    const { RealEstateTrustAccounting } = await import('./RealEstateTrustAccounting');
    return RealEstateTrustAccounting[operation](...args);
  },
  
  offers: async (operation, ...args) => {
    const { RealEstateOffers } = await import('./RealEstateOffers');
    return RealEstateOffers[operation](...args);
  },
  
  documents: async (operation, ...args) => {
    const { RealEstateDocuments } = await import('./RealEstateDocuments');
    return RealEstateDocuments[operation](...args);
  },
  
  contractors: async (operation, ...args) => {
    const { RealEstateContractors } = await import('./RealEstateContractors');
    return RealEstateContractors[operation](...args);
  },
  
  leases: async (operation, ...args) => {
    const { RealEstateLeaseAutomation } = await import('./RealEstateLeaseAutomation');
    return RealEstateLeaseAutomation[operation](...args);
  },
  
  intelligence: async (operation, ...args) => {
    const { RealEstateIntelligence } = await import('./RealEstateIntelligence');
    return RealEstateIntelligence[operation](...args);
  },
  
  analytics: async (operation, ...args) => {
    const { RealEstateAnalytics } = await import('./RealEstateAnalytics');
    return RealEstateAnalytics[operation](...args);
  }
};
