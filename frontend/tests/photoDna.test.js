import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { computeSHA256, formatHash, hashFile } from '../src/utils/hash.js';
import { getEvidenceRecords, saveEvidenceRecord, deleteEvidenceRecord } from '../src/services/evidenceStore.js';

// Mock localStorage for Node test environment if not present
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

// Mock IndexedDB for Node test environment
const mockDbTables = new Map();
if (typeof globalThis.indexedDB === 'undefined') {
  globalThis.indexedDB = {
    open: (_name, _ver) => {
      const storeName = 'photo_dna_records';
      if (!mockDbTables.has(storeName)) mockDbTables.set(storeName, new Map());
      const table = mockDbTables.get(storeName);

      const db = {
        objectStoreNames: { contains: (n) => mockDbTables.has(n) },
        createObjectStore: (n) => {
          if (!mockDbTables.has(n)) mockDbTables.set(n, new Map());
          return { createIndex: () => {} };
        },
        transaction: () => ({
          objectStore: () => ({
            put: (val) => {
              table.set(val.id, val);
              const r = { result: val.id };
              setTimeout(() => r.onsuccess?.({ target: r }), 0);
              return r;
            },
            get: (id) => {
              const r = { result: table.get(id) || null };
              setTimeout(() => r.onsuccess?.({ target: r }), 0);
              return r;
            },
            getAll: () => {
              const r = { result: Array.from(table.values()) };
              setTimeout(() => r.onsuccess?.({ target: r }), 0);
              return r;
            },
            delete: (id) => {
              table.delete(id);
              const r = {};
              setTimeout(() => r.onsuccess?.({ target: r }), 0);
              return r;
            },
            index: () => ({
              get: (val) => {
                const found = Array.from(table.values()).find(x => x.sha256 === val) || null;
                const r = { result: found };
                setTimeout(() => r.onsuccess?.({ target: r }), 0);
                return r;
              }
            })
          })
        })
      };

      const req = { result: db };
      setTimeout(() => {
        req.onupgradeneeded?.({ target: req });
        req.onsuccess?.({ target: req });
      }, 0);
      return req;
    }
  };
}

// Import Photo DNA store after mock indexedDB setup
const { registerPhotoDna, getPhotoDnaRecords, getPhotoDnaRecordById, deletePhotoDnaRecord } = await import('../src/services/photoDnaStore.js');

// Verdict helper replicating getVerdict logic for validation
function computeVerdict(hashOrig, hashSusp, diffResults) {
  if (!hashOrig) {
    return { category: 'Register an original first' };
  }
  if (!hashSusp || !diffResults) {
    return { category: 'Unable to verify — try another image' };
  }
  if (hashOrig.toLowerCase() === hashSusp.toLowerCase()) {
    return { category: 'Exact file match' };
  }
  if (diffResults.diffPercent <= 5.0) {
    return { category: 'Visually similar, file differs' };
  }
  return { category: 'Visual differences detected' };
}

describe('Photo DNA & Cryptographic Hashing Utilities', () => {
  it('correctly hashes strings with SHA-256', async () => {
    const hash = await computeSHA256('abhedya-security-test');
    assert.equal(typeof hash, 'string');
    assert.equal(hash.length, 64);
  });

  it('correctly hashes ArrayBuffer inputs', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const hash = await computeSHA256(bytes.buffer);
    assert.equal(typeof hash, 'string');
    assert.equal(hash.length, 64);
  });

  it('correctly handles ArrayBufferView with byteOffset and subarray length', async () => {
    // Create an underlying buffer of 16 bytes: [0, 0, 0, 0, 1, 2, 3, 4, 0, 0, 0, 0, 0, 0, 0, 0]
    const fullBuffer = new ArrayBuffer(16);
    const fullView = new Uint8Array(fullBuffer);
    fullView.set([1, 2, 3, 4], 4);

    // Subarray from byte 4 of length 4: [1, 2, 3, 4]
    const subView = new Uint8Array(fullBuffer, 4, 4);

    // Standalone buffer with exactly [1, 2, 3, 4]
    const standalone = new Uint8Array([1, 2, 3, 4]);

    const hashSubView = await computeSHA256(subView);
    const hashStandalone = await computeSHA256(standalone);

    // Sliced view MUST produce the exact same hash as standalone [1, 2, 3, 4]
    assert.equal(hashSubView, hashStandalone);
  });

  it('formats truncated hashes for UI presentation', () => {
    const hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const formatted = formatHash(hash);
    assert.equal(formatted, 'e3b0c44298fc...b855');
  });

  it('hashes File and Blob objects consistently', async () => {
    const blob = new Blob([new Uint8Array([10, 20, 30, 40])], { type: 'image/png' });
    const hash = await hashFile(blob);
    assert.equal(typeof hash, 'string');
    assert.equal(hash.length, 64);
  });
});

describe('Photo DNA Registration & Store Operations', () => {
  beforeEach(() => {
    mockDbTables.get('photo_dna_records')?.clear();
    localStorage.clear();
  });

  it('registers an authentic original photo into Photo DNA repository', async () => {
    const testBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);
    const file = new File([testBytes], 'creator_artwork.png', { type: 'image/png' });

    const record = await registerPhotoDna({
      file,
      dimensions: { width: 1920, height: 1080 }
    });

    assert.ok(record.id.startsWith('DNA-'));
    assert.equal(record.fileName, 'creator_artwork.png');
    assert.equal(record.fileType, 'image/png');
    assert.equal(record.dimensions.width, 1920);
    assert.equal(record.dimensions.height, 1080);
    assert.equal(typeof record.sha256, 'string');
    assert.equal(record.sha256.length, 64);

    // Verify retrieval by ID
    const retrieved = await getPhotoDnaRecordById(record.id);
    assert.ok(retrieved);
    assert.equal(retrieved.id, record.id);
    assert.equal(retrieved.sha256, record.sha256);
  });

  it('prevents duplicate registration of the exact same image bytes', async () => {
    const testBytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4, 5, 6]);
    const file1 = new File([testBytes], 'original_photo.png', { type: 'image/png' });
    const file2 = new File([testBytes], 'duplicate_photo.png', { type: 'image/png' });

    const first = await registerPhotoDna({ file: file1 });
    assert.ok(first.id);

    // Second registration with identical bytes must throw with existingRecord attached
    await assert.rejects(
      async () => {
        await registerPhotoDna({ file: file2 });
      },
      (err) => {
        assert.ok(err.existingRecord);
        assert.equal(err.existingRecord.id, first.id);
        return true;
      }
    );
  });

  it('rejects unsupported file formats gracefully', async () => {
    const docBytes = new Uint8Array([37, 80, 68, 70]);
    const invalidFile = new File([docBytes], 'document.pdf', { type: 'application/pdf' });

    await assert.rejects(
      async () => {
        await registerPhotoDna({ file: invalidFile });
      },
      /Unsupported image format/
    );
  });

  it('rejects empty or null file registration', async () => {
    await assert.rejects(
      async () => {
        await registerPhotoDna({ file: null });
      },
      /No image file provided/
    );
  });

  it('deletes registered Photo DNA records from storage and evidenceStore', async () => {
    const testBytes = new Uint8Array([137, 80, 78, 71, 99, 99]);
    const file = new File([testBytes], 'to_delete.png', { type: 'image/png' });

    const registered = await registerPhotoDna({ file });
    assert.ok(registered.id);

    const deleted = await deletePhotoDnaRecord(registered.id);
    assert.equal(deleted, true);

    const postCheck = await getPhotoDnaRecordById(registered.id);
    assert.equal(postCheck, null);
  });
});

describe('Photo DNA Verification Verdict Interpretation', () => {
  const originalHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  it('verifies exact file match when SHA-256 hashes are identical', () => {
    const identicalHash = originalHash;
    const diffResults = { diffPercent: 0.0, matchPercent: 100.0 };
    const verdict = computeVerdict(originalHash, identicalHash, diffResults);
    assert.equal(verdict.category, 'Exact file match');
  });

  it('verifies visually similar, file differs when hashes differ but diff is <= 5%', () => {
    const differentHash = 'a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef';
    // 2.5% diff represents minor re-compression or re-encoding
    const diffResults = { diffPercent: 2.5, matchPercent: 97.5 };
    const verdict = computeVerdict(originalHash, differentHash, diffResults);
    assert.equal(verdict.category, 'Visually similar, file differs');
  });

  it('verifies visual differences detected when hashes differ and diff is > 5%', () => {
    const modifiedHash = 'ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100';
    // 28% diff represents significant image modification or tampering
    const diffResults = { diffPercent: 28.0, matchPercent: 72.0 };
    const verdict = computeVerdict(originalHash, modifiedHash, diffResults);
    assert.equal(verdict.category, 'Visual differences detected');
  });

  it('returns "Register an original first" when no original hash is provided', () => {
    const variantHash = 'a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef';
    const diffResults = { diffPercent: 10.0, matchPercent: 90.0 };
    const verdict = computeVerdict('', variantHash, diffResults);
    assert.equal(verdict.category, 'Register an original first');
  });

  it('returns "Unable to verify — try another image" when variant image or diff is missing', () => {
    const verdictNoVariant = computeVerdict(originalHash, '', null);
    assert.equal(verdictNoVariant.category, 'Unable to verify — try another image');

    const verdictNoDiff = computeVerdict(originalHash, 'some-hash', null);
    assert.equal(verdictNoDiff.category, 'Unable to verify — try another image');
  });
});

describe('Evidence Vault & Photo DNA Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and preserves Photo DNA evidence records in localStorage', async () => {
    const record = await saveEvidenceRecord({
      id: 'DNA-20261009-1234',
      incidentType: 'Photo DNA',
      title: 'Photo DNA: original_camera_shot.png',
      content: 'Registered Original Reference | DNA Fingerprint: e3b0c44298fc...',
      category: 'Photo DNA Registration',
      riskLevel: 'Safe',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      source: 'original_camera_shot.png',
    });

    assert.equal(record.id, 'DNA-20261009-1234');
    assert.equal(record.sha256, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

    // Verify persistence after simulated reload
    const stored = getEvidenceRecords();
    assert.equal(stored.length, 1);
    assert.equal(stored[0].id, 'DNA-20261009-1234');
    assert.equal(stored[0].sha256, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('safely loads older evidence records that lack Photo DNA metadata without errors', async () => {
    // Populate with legacy record structure
    const legacyRecord = {
      id: 'REC-20260101-9999',
      incidentType: 'General Incident',
      title: 'Legacy Record',
      content: 'Older incident recorded before Photo DNA feature',
      category: 'General',
      riskLevel: 'Low',
      timestamp: '2026-01-01T00:00:00.000Z',
      sha256: '1234567890abcdef',
    };
    localStorage.setItem('abhedya_evidence_records', JSON.stringify([legacyRecord]));

    const retrieved = getEvidenceRecords();
    assert.equal(retrieved.length, 1);
    assert.equal(retrieved[0].id, 'REC-20260101-9999');
    assert.equal(retrieved[0].photoDnaId, undefined);
  });

  it('updates and deletes evidence records correctly', async () => {
    await saveEvidenceRecord({
      id: 'DNA-20261009-5678',
      incidentType: 'Photo DNA',
      title: 'Photo DNA to Delete',
    });

    assert.equal(getEvidenceRecords().length, 1);

    const deleted = deleteEvidenceRecord('DNA-20261009-5678');
    assert.equal(deleted, true);
    assert.equal(getEvidenceRecords().length, 0);
  });
});
