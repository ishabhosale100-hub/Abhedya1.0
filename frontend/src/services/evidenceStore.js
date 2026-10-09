import { computeSHA256 } from '../utils/hash.js';

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

  const computedHash = await computeSHA256(hashPayload);
  const sha256 = item.sha256 || computedHash;

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
    evidenceDetails: item.evidenceDetails || null,
  };

  // Prevent duplicate IDs: replace if exists, otherwise unshift
  const existingIndex = records.findIndex(r => r.id === id);
  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.unshift(record);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (quotaErr) {
    console.warn('Storage quota exceeded in localStorage, trimming older thumbnails:', quotaErr);
    // Strip heavy thumbnails from older records to free quota
    records.slice(10).forEach(r => { r.thumbnailUrl = null; });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save evidence records to localStorage:', e);
    }
  }
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
  const criticalCount = records.filter(r => 
    r.riskLevel === 'Critical' || (typeof r.riskScore === 'number' && r.riskScore >= 75)
  ).length;
  const flaggedCommentsCount = records.filter(r => r.incidentType === 'Comment Safety').length;

  return {
    totalRecords,
    criticalCount,
    flaggedCommentsCount
  };
}

/**
 * Calculates a transparent Creator Safety Risk Indicator based strictly on saved evidence.
 * Priorities:
 * 1. Uses exact numeric riskScore (e.g. 50) as base signal, avoiding arbitrary stepped constants.
 * 2. Requires explicit threat indicators (not general harassment) to apply additional threat boosts.
 * 3. Reports discrepancies between numeric riskScore and text riskLevel without altering saved data.
 * 4. Considers recency, image differences (review signals), and repeated sources transparently.
 * 
 * @returns {Object} Safety score assessment object
 */
export function calculateCreatorSafetyScore() {
  const records = getEvidenceRecords();

  const disclaimer = "This indicator reflects detected risk signals in saved evidence. It is not an objective measurement of a person's actual safety and is not a guarantee of safety.";

  // 1. Empty State Guard
  if (records.length === 0) {
    return {
      score: null,
      status: 'Insufficient Data',
      color: 'neutral',
      contributingFactors: ['No saved evidence records available.'],
      evidenceCoverage: { totalRecords: 0, highestRisk: 'N/A', unratedCount: 0 },
      disclaimer
    };
  }

  let highestScoreDetected = null;
  let highestTierLabel = 'Safe / Low';
  let highRiskRecordCount = 0;
  let recentIncidentDetected = false;
  let hasHighDeltaImage = false;
  let hasThreatCategory = false;
  let hasPIICategory = false;
  let unratedCount = 0;
  const discrepancies = [];
  const authorsMap = {};

  records.forEach(r => {
    const level = r.riskLevel || 'N/A';
    const score = typeof r.riskScore === 'number' ? r.riskScore : null;
    const cat = (r.category || '').toLowerCase();
    const incidentType = (r.incidentType || '').toLowerCase();
    const reasons = Array.isArray(r.reasons) ? r.reasons.join(' ').toLowerCase() : '';
    const author = (r.details && r.details.author) || r.source || 'Unknown';

    // Track unrated / missing risk metrics
    if (level === 'N/A' && score === null) {
      unratedCount++;
      return;
    }

    // Recency Check (within last 7 days)
    if (r.timestamp) {
      const recordTime = new Date(r.timestamp).getTime();
      const now = Date.now();
      if (!isNaN(recordTime) && (now - recordTime) <= 7 * 24 * 60 * 60 * 1000) {
        recentIncidentDetected = true;
      }
    }

    // Forensic Image Diff Check (review signal, not automatic threat)
    if (incidentType.includes('forensic diff') || cat.includes('forensic diff')) {
      if (r.evidenceData && r.evidenceData.diffPercentage > 20) {
        hasHighDeltaImage = true;
      }
    }

    // Determine effective numeric score for this record
    let recordEffectiveScore = 0;
    let expectedTier = 'Low';

    if (score !== null) {
      recordEffectiveScore = Math.max(0, Math.min(100, score));
      if (recordEffectiveScore >= 75) expectedTier = 'Critical';
      else if (recordEffectiveScore >= 50) expectedTier = 'High';
      else if (recordEffectiveScore >= 25) expectedTier = 'Medium';
      else expectedTier = 'Low';

      // Discrepancy detection
      if (level !== 'N/A' && level.toLowerCase() !== expectedTier.toLowerCase()) {
        discrepancies.push(`Record ${r.id}: saved level '${level}' differs from calculated score ${score} (${expectedTier} tier).`);
      }
    } else {
      // Fallback to text string level if numeric score is absent
      if (level === 'Critical') { recordEffectiveScore = 85; expectedTier = 'Critical'; }
      else if (level === 'High') { recordEffectiveScore = 60; expectedTier = 'High'; }
      else if (level === 'Medium') { recordEffectiveScore = 35; expectedTier = 'Medium'; }
      else { recordEffectiveScore = 0; expectedTier = 'Low'; }
    }

    // Track highest overall base score
    if (highestScoreDetected === null || recordEffectiveScore > highestScoreDetected) {
      highestScoreDetected = recordEffectiveScore;
      highestTierLabel = expectedTier;
    }

    // Track high risk incident count (score >= 50)
    if (recordEffectiveScore >= 50) {
      highRiskRecordCount++;
      authorsMap[author] = (authorsMap[author] || 0) + 1;
    }

    // Explicit Threat Check
    if (
      cat.includes('threat') || 
      incidentType.includes('threat') || 
      reasons.includes('direct threat') || 
      reasons.includes('physical threat') || 
      reasons.includes('violence')
    ) {
      hasThreatCategory = true;
    }

    // Explicit PII Check
    if (
      cat.includes('pii') || 
      cat.includes('doxx') || 
      reasons.includes('phone') || 
      reasons.includes('address') || 
      reasons.includes('ssn')
    ) {
      hasPIICategory = true;
    }
  });

  const baseSeverityScore = highestScoreDetected !== null ? highestScoreDetected : 0;
  const contributingFactors = [];

  // Report Primary Severity Factor using exact baseScore
  if (baseSeverityScore >= 75) {
    contributingFactors.push(`Primary signal: Critical risk detected in saved evidence (Score: ${baseSeverityScore})`);
  } else if (baseSeverityScore >= 50) {
    contributingFactors.push(`Primary signal: High risk incident detected (Score: ${baseSeverityScore})`);
  } else if (baseSeverityScore >= 25) {
    contributingFactors.push(`Primary signal: Moderate risk incident detected (Score: ${baseSeverityScore})`);
  } else {
    contributingFactors.push(`Primary signal: Low or minimal risk signals in saved evidence (Score: ${baseSeverityScore})`);
  }

  // Calculate Single-Apply Boosts (Capped at +15 max)
  let threatBoosts = 0;

  if (hasThreatCategory) {
    threatBoosts += 10;
    contributingFactors.push("Direct threat signal detected (+10)");
  }

  if (hasPIICategory) {
    threatBoosts += 10;
    contributingFactors.push("PII / exposure signal detected (+10)");
  }

  const hasRepeatedSource = Object.values(authorsMap).some(count => count >= 2);
  if (hasRepeatedSource) {
    threatBoosts += 5;
    contributingFactors.push("Repeated harassment signal detected from same source (+5)");
  } else if (highRiskRecordCount >= 2) {
    threatBoosts += 5;
    contributingFactors.push("Multiple distinct high-risk incidents recorded (+5)");
  }

  if (recentIncidentDetected) {
    threatBoosts += 5;
    contributingFactors.push("Recent incident recorded within the last 7 days (+5)");
  }

  if (hasHighDeltaImage) {
    contributingFactors.push("Image Forensic Notice: Visual differences detected (>20% delta) awaiting manual review.");
  }

  threatBoosts = Math.min(15, threatBoosts);

  // Final Score strictly capped at 100
  const finalScore = Math.min(100, baseSeverityScore + threatBoosts);

  // Status mapping derived from final capped score
  let status = 'Low Risk Detected';
  let color = 'secondary';

  if (finalScore >= 75) {
    status = 'Critical Risk';
    color = 'error';
  } else if (finalScore >= 50) {
    status = 'Elevated Risk';
    color = 'tertiary';
  } else if (finalScore >= 25) {
    status = 'Moderate Risk';
    color = 'outline';
  }

  // Add discrepancy notes
  discrepancies.forEach(d => contributingFactors.push(`Metadata Notice: ${d}`));

  if (unratedCount > 0) {
    contributingFactors.push(`${unratedCount} unrated record(s) excluded from numeric scoring.`);
  }

  return {
    score: finalScore,
    status,
    color,
    contributingFactors,
    evidenceCoverage: {
      totalRecords: records.length,
      highestRisk: highestTierLabel,
      unratedCount
    },
    disclaimer
  };
}