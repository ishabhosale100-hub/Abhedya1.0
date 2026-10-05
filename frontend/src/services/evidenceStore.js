import { computeSHA256 } from '../utils/hash';

const STORAGE_KEY = 'abhedya_evidence_records';

/**
 * Get all evidence records from localStorage.
 * @returns {Array} Array of record objects
 */
export function getEvidenceRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const records = JSON.parse(raw);
    return Array.isArray(records) ? records : [];
  } catch (err) {
    console.error('Failed to parse evidence records from localStorage:', err);
    return [];
  }
}

/**
 * Save a new evidence record to localStorage.
 * Computes SHA-256 fingerprint of the record content automatically.
 * @param {Object} item 
 * @returns {Promise<Object>} Saved record
 */
export async function saveEvidenceRecord(item) {
  const records = getEvidenceRecords();
  
  const timestamp = new Date().toISOString();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const dateStr = timestamp.slice(0, 10).replace(/-/g, '');
  const id = item.id || `REC-${dateStr}-${randomSuffix}`;
  
  // Content payload for hashing
  const hashPayload = JSON.stringify({
    id,
    incidentType: item.incidentType || 'General Incident',
    title: item.title || 'Evidence Record',
    content: item.content || '',
    category: item.category || 'General',
    riskLevel: item.riskLevel || 'N/A',
    timestamp,
  });

  const sha256 = await computeSHA256(hashPayload);

  const record = {
    id,
    incidentType: item.incidentType || 'General Incident',
    title: item.title || 'Evidence Record',
    content: item.content || '',
    category: item.category || 'General',
    riskLevel: item.riskLevel || 'N/A',
    riskScore: typeof item.riskScore === 'number' ? item.riskScore : null,
    source: item.source || 'Local Upload',
    timestamp,
    notes: item.notes || '',
    sha256,
    thumbnailUrl: item.thumbnailUrl || null,
    reasons: item.reasons || [],
  };

  // Add at top of array
  records.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return record;
}

/**
 * Update notes for a specific record.
 * @param {string} id 
 * @param {string} notes 
 * @returns {boolean} Success
 */
export function updateEvidenceRecordNotes(id, notes) {
  const records = getEvidenceRecords();
  const index = records.findIndex(r => r.id === id);
  if (index === -1) return false;
  
  records[index].notes = notes;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return true;
}

/**
 * Delete a specific record by ID.
 * @param {string} id 
 * @returns {boolean} Success
 */
export function deleteEvidenceRecord(id) {
  const records = getEvidenceRecords();
  const filtered = records.filter(r => r.id !== id);
  if (filtered.length === records.length) return false;
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Get real evidence statistics for the dashboard.
 * @returns {Object} { totalRecords, flaggedCommentsCount, criticalCount }
 */
export function getEvidenceStats() {
  const records = getEvidenceRecords();
  const totalRecords = records.length;
  const criticalCount = records.filter(r => r.riskLevel === 'Critical' || r.riskLevel === 'High').length;
  const flaggedCommentsCount = records.filter(r => r.incidentType === 'Comment Safety').length;
  return {
    totalRecords,
    criticalCount,
    flaggedCommentsCount
  };
}
