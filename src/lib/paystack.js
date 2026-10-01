/**
 * Paystack Subscription Integration Utility
 */

const PAYSTACK_SDK_URL = 'https://js.paystack.co/v1/inline.js';
// High-fidelity sandbox public key for instant test checkouts
const DEFAULT_TEST_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_a25c1103c80918738b556396bc7a8790b50302b1';

export function loadPaystackScript() {
  return new Promise((resolve) => {
    if (window.PaystackPop) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = PAYSTACK_SDK_URL;
    script.async = true;
    script.onload = () => {
      // Paystack SDK loaded successfully.
      resolve(true);
    };
    script.onerror = () => {
      console.error('Failed to load Paystack SDK.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Trigger a Paystack checkout pop-up for subscription billing
 */
export async function initiatePaystackSubscription({
  email,
  amount, // amount in USD or local currency
  currency = 'USD',
  planName,
  companyId,
  onSuccess,
  onClose
}) {
  const loaded = await loadPaystackScript();
  if (!loaded) {
    alert("Could not load Paystack billing script. Please check your internet connection.");
    return;
  }

  // Multiply by 100 as Paystack expects the amount in the smallest currency unit (cents/kobo)
  const finalAmount = Math.round(amount * 100);

  const handler = window.PaystackPop.setup({
    key: DEFAULT_TEST_PUBLIC_KEY,
    email: email,
    amount: finalAmount,
    currency: currency,
    ref: `sub_${companyId.slice(0, 8)}_${Date.now()}`,
    metadata: {
      custom_fields: [
        {
          display_name: "Plan Name",
          variable_name: "plan_name",
          value: planName
        },
        {
          display_name: "Company ID",
          variable_name: "company_id",
          value: companyId
        }
      ]
    },
    callback: function(response) {
      // Paystack payment successful
      if (onSuccess) onSuccess(response);
    },
    onClose: function() {
      // Paystack checkout window closed by user
      if (onClose) onClose();
    }
  });

  handler.openIframe();
}
