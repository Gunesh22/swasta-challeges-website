// ===== LocalStorage Abstraction =====
// Handles local persistence for all challenge state.
// Schema versioned to allow safe migrations.

import { STORAGE_KEY, INITIAL_STATE } from '../constants';

const SCHEMA_VERSION = 2;
const VERSION_KEY = `${STORAGE_KEY}_version`;

/**
 * Migrate old schema (v1 — flat completedDays/reflections) to v2 (nested under challenges[id]).
 */
function migrateState(raw, version) {
    if (version >= SCHEMA_VERSION) return raw;

    // v1 → v2: move flat completedDays/reflections into challenges map
    if (version < 2) {
        const migrated = { ...raw };
        if (raw.activeChallengeId && (raw.completedDays || raw.reflections)) {
            if (!migrated.challenges) migrated.challenges = {};
            if (!migrated.challenges[raw.activeChallengeId]) {
                migrated.challenges[raw.activeChallengeId] = {
                    startDate: raw.startDate || null,
                    completedDays: raw.completedDays || {},
                    reflections: raw.reflections || {},
                    habitCompletions: raw.habitCompletions || {},
                };
            }
            // Clean up flat fields
            delete migrated.completedDays;
            delete migrated.reflections;
            delete migrated.habitCompletions;
            delete migrated.startDate;
        }
        return migrated;
    }

    return raw;
}

/**
 * Loads challenge state from localStorage.
 * Migrates old schemas automatically.
 * Returns INITIAL_STATE if nothing stored or parse fails.
 */
export function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const version = parseInt(localStorage.getItem(VERSION_KEY) || '1', 10);

        if (raw) {
            const parsed = JSON.parse(raw);
            const migrated = migrateState(parsed, version);

            // Save migrated state back immediately
            if (version < SCHEMA_VERSION) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
                localStorage.setItem(VERSION_KEY, String(SCHEMA_VERSION));
            }

            return {
                ...INITIAL_STATE,
                ...migrated,
                challenges: migrated.challenges || {},
            };
        }
    } catch (e) {
        console.warn('[Storage] Failed to load state:', e);
    }
    return {
        ...INITIAL_STATE,
        challenges: {},
    };
}

/**
 * Persists challenge state to localStorage.
 * Always stamps the current schema version.
 */
export function saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        localStorage.setItem(VERSION_KEY, String(SCHEMA_VERSION));
    } catch (e) {
        console.warn('[Storage] Failed to save state:', e);
        // If quota exceeded, try clearing old cache before retrying
        try {
            localStorage.removeItem('tgf_pending_syncs');
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e2) {
            console.error('[Storage] Critical: Cannot persist state', e2);
        }
    }
}

/**
 * Clears all challenge data from localStorage.
 */
export function clearState() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(VERSION_KEY);
    } catch (e) {
        console.warn('[Storage] Failed to clear state:', e);
    }
}

// ===== Persistent Retry Queue for Failed Firestore Writes =====

const PENDING_SYNC_KEY = 'tgf_pending_syncs';

/**
 * Loads pending sync items from localStorage.
 * Each item: { type: 'completeDay'|'joinChallenge', args: [...], timestamp: number }
 */
export function loadPendingSyncs() {
    try {
        const raw = localStorage.getItem(PENDING_SYNC_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function savePendingSyncs(queue) {
    try {
        localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(queue));
    } catch (e) {
        console.warn('[Storage] Failed to save pending syncs:', e);
    }
}

/**
 * Adds a failed Firestore operation to the retry queue.
 */
export function enqueueSync(type, args) {
    const queue = loadPendingSyncs();
    const key = JSON.stringify({ type, args });
    if (queue.some(item => JSON.stringify({ type: item.type, args: item.args }) === key)) return;
    queue.push({ type, args, timestamp: Date.now() });
    savePendingSyncs(queue);
}

/**
 * Removes successfully synced items from the queue by index.
 */
export function dequeueSyncs(indices) {
    const queue = loadPendingSyncs();
    for (const i of [...indices].sort((a, b) => b - a)) {
        queue.splice(i, 1);
    }
    savePendingSyncs(queue);
}

/**
 * Clears the entire pending sync queue (e.g. after full successful sync).
 */
export function clearPendingSyncs() {
    try {
        localStorage.removeItem(PENDING_SYNC_KEY);
    } catch { }
}
