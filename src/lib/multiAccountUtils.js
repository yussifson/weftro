const STORAGE_KEY = 'optavel_saved_accounts';

/**
 * Retrieves the list of saved accounts from localStorage.
 * @returns {Array} List of account objects.
 */
export function getSavedAccounts() {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to parse saved accounts", e);
    return [];
  }
}

/**
 * Saves or updates an account in the saved accounts list.
 * @param {Object} session - The Supabase auth session object.
 * @param {Object} profile - The user profile containing full_name, avatar_url, etc.
 */
export function saveAccount(session, profile = null) {
  if (typeof window === 'undefined' || !session || !session.user) return;

  try {
    const accounts = getSavedAccounts();
    const userId = session.user.id;
    
    // Create the account object we want to save
    // Detect provider from identities array (google, email, etc.)
    const provider = session.user?.app_metadata?.provider ||
      (session.user?.identities?.[0]?.provider) ||
      'email';

    const newAccount = {
      id: userId,
      email: session.user.email,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      full_name: profile?.full_name || session.user?.user_metadata?.full_name || '',
      avatar_url: profile?.avatar_url || session.user?.user_metadata?.avatar_url || '',
      provider,
      last_active: new Date().toISOString(),
      logged_out: false
    };

    // Check if the user already exists in our saved list
    const existingIndex = accounts.findIndex(acc => acc.id === userId);
    
    if (existingIndex >= 0) {
      // Update existing account
      accounts[existingIndex] = { ...accounts[existingIndex], ...newAccount };
    } else {
      // Add new account
      accounts.push(newAccount);
    }

    // Sort by most recently active
    accounts.sort((a, b) => new Date(b.last_active) - new Date(a.last_active));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error("Failed to save account", e);
  }
}

/**
 * Removes a specific account by user ID.
 * @param {string} userId - The Supabase user ID to remove.
 */
export function removeAccount(userId) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const accounts = getSavedAccounts();
    const filteredAccounts = accounts.filter(acc => acc.id !== userId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredAccounts));
  } catch (e) {
    console.error("Failed to remove account", e);
  }
}

/**
 * Marks a specific account as logged out.
 * @param {string} userId - The Supabase user ID to mark as logged out.
 */
export function markAccountLoggedOut(userId) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const accounts = getSavedAccounts();
    const existingIndex = accounts.findIndex(acc => acc.id === userId);
    if (existingIndex >= 0) {
      accounts[existingIndex].logged_out = true;
      accounts[existingIndex].access_token = null;
      accounts[existingIndex].refresh_token = null;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    }
  } catch (e) {
    console.error("Failed to mark account logged out", e);
  }
}

/**
 * Clears all saved accounts.
 */
export function clearAllAccounts() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
