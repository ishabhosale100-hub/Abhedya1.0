import { hashFile, computeSHA256 } from '../utils/hash.js';
import { saveEvidenceRecord, deleteEvidenceRecord as deleteStoredEvidence } from './evidenceStore.js';

const DB_NAME = 'abhedya_dna_vault_db';
const DB_VERSION = 1;
const STORE_NAME = 'photo_dna_records';

/**
 * Open or create the IndexedDB instance for Photo DNA records.
 * @returns {Promise<IDBDatabase>}
 */
function openDnaDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('sha256', 'sha256', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error || new Error('Failed to open IndexedDB'));
  });
}

/**
 * Generate a small thumbnail data URL from an Image element or Blob for fast preview.
 * @param {HTMLImageElement|Blob|File} source
 * @returns {Promise<string|null>}
 */
async function generateThumbnail(source) {
  try {
    if (typeof document === 'undefined') return null;

    let img;
    if (source instanceof HTMLImageElement) {
      img = source;
    } else if (source instanceof Blob || source instanceof File) {
      img = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(source);
      });
    }

    if (!img) return null;

    const canvas = document.createElement('canvas');
    const maxDim = 120;
    const scale = Math.min(maxDim / (img.naturalWidth || 100), maxDim / (img.naturalHeight || 100), 1);
    canvas.width = Math.max(20, Math.floor((img.naturalWidth || 100) * scale));
    canvas.height = Math.max(20, Math.floor((img.naturalHeight || 100) * scale));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.6);
  } catch (err) {
    console.warn('Could not generate thumbnail for Photo DNA record:', err);
    return null;
  }
}

/**
 * Register an authentic original photo into the persistent Photo DNA repository.
 * Stores exact file SHA-256 fingerprint, persistent image blob, and minimal metadata.
 * 
 * @param {Object} params
 * @param {File|Blob} params.file - Original image file/blob
 * @param {HTMLImageElement} [params.imageObj] - Preloaded image element (optional)
 * @param {string} [params.customId] - Optional custom ID
 * @param {Object} [params.dimensions] - { width, height }
 * @returns {Promise<Object>} Registered record
 */
export async function registerPhotoDna({ file, imageObj, customId, dimensions }) {
  if (!file) {
    throw new Error('No image file provided for Photo DNA registration');
  }

  // Validate supported image types
  const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
  if (file.type && !validTypes.includes(file.type)) {
    throw new Error('Unsupported image format. Please use PNG, JPEG, or WebP.');
  }

  // Compute exact byte-level SHA-256 fingerprint
  const sha256 = await hashFile(file);

  // Check for duplicate registration by SHA-256
  const existing = await getPhotoDnaRecordByHash(sha256);
  if (existing) {
    const error = new Error(`Photo is already registered under Photo DNA ID: ${existing.id}`);
    error.existingRecord = existing;
    throw error;
  }

  const timestamp = new Date().toISOString();
  const dateStr = timestamp.slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const id = customId || `DNA-${dateStr}-${randomSuffix}`;

  // Dimensions
  const dims = dimensions || {
    width: imageObj?.naturalWidth || 0,
    height: imageObj?.naturalHeight || 0
  };

  const fileSize = file.size || 0;
  const fileSizeStr = `${(fileSize / (1024 * 1024)).toFixed(2)} MB`;
  const fileName = file.name || `photo_dna_${dateStr}.png`;
  const fileType = file.type || 'image/png';

  // Generate lightweight preview thumbnail
  const thumbnailUrl = await generateThumbnail(imageObj || file);

  // Prepare persistent IndexedDB record with full Blob
  const dnaRecord = {
    id,
    sha256,
    fileName,
    timestamp,
    fileSize,
    fileSizeStr,
    fileType,
    dimensions: dims,
    imageBlob: file, // Stored as Blob in IndexedDB
    thumbnailUrl,
  };

  // 1. Persist in IndexedDB
  const db = await openDnaDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(dnaRecord);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to save to IndexedDB'));
  });

  // 2. Also register metadata in evidenceStore for vault & report compatibility (without heavy blob)
  try {
    await saveEvidenceRecord({
      id,
      incidentType: 'Photo DNA',
      title: `Photo DNA: ${fileName}`,
      content: `Registered Original Reference | DNA Fingerprint: ${sha256}`,
      category: 'Photo DNA Registration',
      riskLevel: 'Safe',
      riskScore: 0,
      source: fileName,
      notes: `Dimensions: ${dims.width}x${dims.height} px | Size: ${fileSizeStr} | Type: ${fileType}`,
      thumbnailUrl,
    });
  } catch (err) {
    console.warn('Could not mirror Photo DNA metadata to evidenceStore:', err);
  }

  return dnaRecord;
}

/**
 * Retrieve all registered Photo DNA records from IndexedDB.
 * @returns {Promise<Array<Object>>}
 */
export async function getPhotoDnaRecords() {
  try {
    const db = await openDnaDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = req.result || [];
        // Sort descending by registration timestamp
        records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        resolve(records);
      };
      req.onerror = () => reject(req.error || new Error('Failed to fetch Photo DNA records'));
    });
  } catch (err) {
    console.error('Failed to get Photo DNA records:', err);
    return [];
  }
}

/**
 * Retrieve a specific Photo DNA record by its ID, including persistent imageBlob.
 * @param {string} id 
 * @returns {Promise<Object|null>}
 */
export async function getPhotoDnaRecordById(id) {
  if (!id) return null;
  try {
    const db = await openDnaDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error(`Failed to fetch record ${id}`));
    });
  } catch (err) {
    console.error(`Failed to get Photo DNA record ${id}:`, err);
    return null;
  }
}

/**
 * Retrieve a specific Photo DNA record by exact SHA-256 fingerprint.
 * @param {string} sha256 
 * @returns {Promise<Object|null>}
 */
export async function getPhotoDnaRecordByHash(sha256) {
  if (!sha256) return null;
  try {
    const db = await openDnaDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('sha256');
      const req = index.get(sha256);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error('Index lookup error'));
    });
  } catch (err) {
    return null;
  }
}

/**
 * Delete a Photo DNA record by ID from IndexedDB and evidenceStore.
 * @param {string} id 
 * @returns {Promise<boolean>}
 */
export async function deletePhotoDnaRecord(id) {
  if (!id) return false;
  try {
    const db = await openDnaDatabase();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error(`Failed to delete record ${id}`));
    });

    // Also remove from evidenceStore
    deleteStoredEvidence(id);
    return true;
  } catch (err) {
    console.error(`Failed to delete Photo DNA record ${id}:`, err);
    return false;
  }
}
