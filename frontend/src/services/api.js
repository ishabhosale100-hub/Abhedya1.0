/**
 * Central API Service for Abhedya Frontend.
 * ALL backend fetch calls must be placed here.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Check if backend server is online.
 * @returns {Promise<boolean>}
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data && data.status === 'ok');
  } catch (_err) {
    return false;
  }
}

/**
 * Send batch comments to backend for AI + rules analysis.
 * @param {Array<string>} comments - Array of comment strings
 * @param {string} sensitivity - 'standard' or 'strict'
 * @returns {Promise<{results: Array, error?: string}>}
 */
export async function analyzeComments(comments, sensitivity = 'standard') {
  if (!Array.isArray(comments) || comments.length === 0) {
    return { results: [], error: 'Please enter at least one comment to analyze.' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comments,
        sensitivity,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const message = errData.detail || `Server error (${response.status})`;
      return { results: [], error: message };
    }

    const data = await response.json();
    return { results: data.results || [] };
  } catch (error) {
    console.error('API call failed:', error);
    return {
      results: [],
      error: 'Cannot reach the analysis server. Check that the backend is running at http://127.0.0.1:8000.',
    };
  }
}


/**
 * Analyze one comment and record it as an incident for a demo account.
 * @param {string} accountId - Demo account ID (not a verified identity)
 * @param {string} platform - e.g. 'instagram'
 * @param {string} comment - The comment text
 * @param {string} sensitivity - 'standard' or 'strict'
 * @returns {Promise<{data: {incident: Object, history: Array} | null, error?: string}>}
 */
export async function analyzeIncident(accountId, platform, comment, sensitivity = 'standard') {
  if (!accountId?.trim() || !platform?.trim() || !comment?.trim()) {
    return { data: null, error: 'Account ID, platform and comment are required.' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/incidents/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_id: accountId.trim(),
        platform: platform.trim(),
        comment: comment.trim(),
        sensitivity,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const message =
        typeof errData.detail === 'string' ? errData.detail : `Server error (${response.status})`;
      return { data: null, error: message };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Incident API call failed:', error);
    return {
      data: null,
      error: 'Cannot reach the analysis server. Check that the backend is running at http://127.0.0.1:8000.',
    };
  }
}