import { Capacitor } from '@capacitor/core';

export const getPlatform = () => {
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform(); // 'ios' or 'android'
  }
  
  // Fallback to user-agent for testing in browser
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  if (/android/i.test(userAgent)) {
    return 'android';
  }
  if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
    return 'ios';
  }
  return 'web';
};

export const isIOS = () => getPlatform() === 'ios';
export const isAndroid = () => getPlatform() === 'android';
export const isMobile = () => isIOS() || isAndroid();
