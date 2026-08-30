export function cleanOrphanedSessions() {
  try {
    const indexSaved = localStorage.getItem('sowa_sessions_index') || localStorage.getItem('maya_sessions_index');
    if (!indexSaved) return;
    const index = JSON.parse(indexSaved);
    if (!Array.isArray(index)) return;
    const activeIds = new Set(index.map(s => s.id));
    
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sowa_session_') || key.startsWith('maya_session_')) && !key.includes('sessions_index')) {
        const sessionId = key.replace('sowa_session_', '').replace('maya_session_', '');
        if (!activeIds.has(sessionId)) {
          keysToDelete.push(key);
        }
      }
    }
    
    keysToDelete.forEach(k => {
      localStorage.removeItem(k);
      console.log(`Cleaned up orphaned session key: ${k}`);
    });
  } catch (e) {
    console.error('Error cleaning orphaned sessions:', e);
  }
}

/**
 * Safely saves data to localStorage with QuotaExceededError handling.
 * If storage is full, it will try to remove items from a specified "volatile" key
 * to make room for the new data.
 */
export function safeSaveToLocalStorage(key: string, value: string, volatileKey: string = 'sowa_snapshots') {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    if (isQuotaExceeded(e)) {
      console.warn(`Storage quota exceeded while saving "${key}". Cleaning sessions & pruning volatile data...`);
      cleanOrphanedSessions();
      pruneVolatileData(volatileKey, 2);
      pruneVolatileData('maya_snapshots', 2);
      
      // Try again
      try {
        localStorage.setItem(key, value);
      } catch (retryError) {
        if (isQuotaExceeded(retryError)) {
          // If still failing, aggressively prune both volatile data and target key if it's prune-able
          let success = false;
          let attempts = 0;
          
          while (!success && attempts < 5) {
            pruneVolatileData(volatileKey, 3);
            pruneVolatileData('maya_snapshots', 3);
            // Prune history to save space if needed
            pruneVolatileData('sowa_history', 5);
            pruneVolatileData('maya_history', 5);
            
            if (key !== volatileKey && key !== 'maya_snapshots') {
              pruneVolatileData(key, 3);
            }

            try {
              localStorage.setItem(key, value);
              success = true;
            } catch (finalError) {
              attempts++;
            }
          }
          
          if (!success) {
            // Last ditch: clear both and try one last time
            localStorage.removeItem(volatileKey);
            localStorage.removeItem('maya_snapshots');
            if (key !== volatileKey && key !== 'maya_snapshots') localStorage.removeItem(key);
            
            try {
              localStorage.setItem(key, value);
            } catch (ultimateError) {
              console.error('CRITICAL: Failed to save even after total prune of all major data collections.');
            }
          }
        }
      }
    } else {
      throw e;
    }
  }
}

function isQuotaExceeded(e: any): boolean {
  return (
    e &&
    (e.code === 22 ||
      e.code === 1014 ||
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}

function pruneVolatileData(key: string, count: number = 1) {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return;
    
    let items = JSON.parse(saved);
    if (Array.isArray(items) && items.length > 0) {
      // Remove the oldest items (from the end of the array)
      const removed = items.splice(-count);
      console.log(`Pruned ${removed.length} item(s) from ${key}. Remaining: ${items.length}`);
      localStorage.setItem(key, JSON.stringify(items));
    } else if (!Array.isArray(items)) {
       // If it's corrupted or not an array, just clear it
       localStorage.removeItem(key);
    }
  } catch (e) {
    console.error('Error pruning data:', e);
    localStorage.removeItem(key); // Total reset if JSON is corrupted
  }
}
