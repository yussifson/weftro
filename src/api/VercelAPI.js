/**
 * API wrapper for interacting with Vercel's Domains API.
 * This allows adding custom domains directly to the Vercel project from the frontend.
 * 
 * Required Environment Variables:
 * VITE_VERCEL_API_TOKEN - A Vercel Personal Access Token
 * VITE_VERCEL_PROJECT_ID - The Vercel Project ID (e.g. prj_xxxx)
 * VITE_VERCEL_TEAM_ID - (Optional) The Vercel Team ID (e.g. team_xxxx) if the project is under a team
 */

const VERCEL_API_URL = 'https://api.vercel.com';

export const VercelAPI = {
  getHeaders: () => {
    return {
      'Authorization': `Bearer ${import.meta.env.VITE_VERCEL_API_TOKEN}`,
      'Content-Type': 'application/json',
    };
  },

  getParams: () => {
    const teamId = import.meta.env.VITE_VERCEL_TEAM_ID;
    return teamId ? `?teamId=${teamId}` : '';
  },

  /**
   * Adds a custom domain to the Vercel project
   * @param {string} domain - The custom domain (e.g., 'app.companyz.com')
   */
  addDomain: async (domain) => {
    const projectId = import.meta.env.VITE_VERCEL_PROJECT_ID;
    if (!projectId || !import.meta.env.VITE_VERCEL_API_TOKEN) {
      throw new Error("Vercel API integration is not configured. Missing API keys.");
    }

    const res = await fetch(`${VERCEL_API_URL}/v9/projects/${projectId}/domains${VercelAPI.getParams()}`, {
      method: 'POST',
      headers: VercelAPI.getHeaders(),
      body: JSON.stringify({ name: domain }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to add domain to Vercel');
    }
    return data;
  },

  /**
   * Removes a custom domain from the Vercel project
   * @param {string} domain 
   */
  removeDomain: async (domain) => {
    const projectId = import.meta.env.VITE_VERCEL_PROJECT_ID;
    if (!projectId || !import.meta.env.VITE_VERCEL_API_TOKEN) {
      throw new Error("Vercel API integration is not configured.");
    }

    const res = await fetch(`${VERCEL_API_URL}/v9/projects/${projectId}/domains/${domain}${VercelAPI.getParams()}`, {
      method: 'DELETE',
      headers: VercelAPI.getHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to remove domain from Vercel');
    }
    return data;
  },

  /**
   * Gets the status of a specific domain (verifies DNS configuration)
   * @param {string} domain 
   */
  verifyDomain: async (domain) => {
    const projectId = import.meta.env.VITE_VERCEL_PROJECT_ID;
    if (!projectId || !import.meta.env.VITE_VERCEL_API_TOKEN) {
      throw new Error("Vercel API integration is not configured.");
    }

    const res = await fetch(`${VERCEL_API_URL}/v9/projects/${projectId}/domains/${domain}${VercelAPI.getParams()}`, {
      method: 'GET',
      headers: VercelAPI.getHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to verify domain status');
    }
    return data;
  }
};
