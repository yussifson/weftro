export const PaystackAPI = {
  /**
   * Dynamically loads the Paystack inline script.
   */
  loadScript: () => {
    return new Promise((resolve, reject) => {
      if (document.getElementById('paystack-script')) {
        return resolve(window.PaystackPop);
      }
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.id = 'paystack-script';
      script.async = true;
      script.onload = () => resolve(window.PaystackPop);
      script.onerror = () => reject(new Error('Failed to load Paystack script'));
      document.body.appendChild(script);
    });
  },

  /**
   * Initializes a Paystack transaction.
   * @param {Object} config - The configuration object for Paystack
   * @param {Function} onSuccess - Callback when payment is successful
   * @param {Function} onClose - Callback when payment window is closed
   */
  initializePayment: async (config, onSuccess, onClose) => {
    try {
      const PaystackPop = await PaystackAPI.loadScript();
      
      const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      if (!paystackPublicKey) {
        throw new Error('Paystack public key is not configured');
      }

      const handler = PaystackPop.setup({
        key: paystackPublicKey,
        email: config.email,
        amount: Math.round(config.amount * 100), // Amount in kobo
        currency: config.currency || 'NGN',
        ref: config.reference || `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metadata: config.metadata || {},
        callback: (response) => {
          if (onSuccess) onSuccess(response);
        },
        onClose: () => {
          if (onClose) onClose();
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error('[PaystackAPI] Payment initialization failed:', error);
      throw error;
    }
  },

  /**
   * Verifies a payment reference
   * @param {string} reference 
   */
  verifyPayment: async (reference) => {
    // In a real production app, verification should happen on the backend via webhooks.
    // However, for client-side quick verification, we can do this.
    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_PAYSTACK_SECRET_KEY}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Payment verification failed');
      }

      const data = await response.json();
      return data.data.status === 'success' ? data.data : null;
    } catch (error) {
      console.error('[PaystackAPI] verifyPayment failed:', error);
      throw error;
    }
  }
};

export default PaystackAPI;
