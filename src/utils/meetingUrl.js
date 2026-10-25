/**
 * Meeting URL generation utility for Weftro V3.
 * Guarantees consistent, canonical invitation links pointing to /join/:id
 * across development, preview, and production environments.
 */

/**
 * Returns the canonical origin for meeting URLs.
 * In browser environments, uses window.location.origin.
 * Fallback to production domain when window is undefined.
 *
 * @returns {string}
 */
export const getMeetingOrigin = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://weftro.com';
};

/**
 * Formats a clean, canonical meeting invitation link.
 *
 * @param {string} roomName - The alphanumeric/hyphenated room name or ID.
 * @param {Object} [options]
 * @param {string} [options.spaceId] - Optional space ID to append as query parameter.
 * @returns {string} Fully qualified meeting join URL.
 */
export const formatMeetingUrl = (roomName, options = {}) => {
  if (!roomName) return '';
  // Strip any accidental leading/trailing slashes, domain, prefix, or duplicate /join/ segments
  const cleanName = String(roomName)
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\/?join\//i, '')
    .replace(/^optavel\//i, '')
    .replace(/^optalflow\//i, '')
    .replace(/^\/+|\/+$/g, '')
    .split('?')[0];

  if (!cleanName) return '';

  const origin = getMeetingOrigin();
  const encodedName = encodeURIComponent(cleanName);
  const url = `${origin}/join/${encodedName}`;
  if (options.spaceId) {
    return `${url}?spaceId=${encodeURIComponent(options.spaceId)}`;
  }
  return url;
};
