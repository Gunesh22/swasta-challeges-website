// ===== Firestore Service =====
// Multiple Challenges Architecture
//
// Data Model:
//   users/{sanitizedPhone}
//     - name, email, phone, createdAt, isAdmin
//
//   user_challenges/{sanitizedPhone}_{challengeId}
//     - userId, challengeId, startDate, createdAt
//     - completedDays: { "YYYY-MM-DD": true, ... }
//     - reflections:   { "YYYY-MM-DD": { feeling, thought }, ... }

import {
    doc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    getCountFromServer,
    serverTimestamp,
    query,
    where,
    writeBatch,
    updateDoc,
    limit,
    arrayUnion
} from 'firebase/firestore';

// ============ IN-MEMORY CACHE ============
const cache = {
    communityCounts: {
        daily: null,
        dailyTimestamp: 0,
        total: null,
        totalTimestamp: 0
    },
    challenges: { data: null, timestamp: 0 },
    adminSettings: { data: null, timestamp: 0 }
};
const CACHE_TTL_MS = 1000 * 30; // 30 seconds cache
import { db } from './firebase';

const USERS = 'users';
const USER_CHALLENGES = 'user_challenges';
const CHALLENGES = 'challenges';
const ADMIN_SETTINGS = 'admin_settings';

// ============ HELPERS ============

function sanitizePhone(phone) {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
}

async function withRetry(fn) {
    try {
        return await fn();
    } catch (err) {
        console.warn('[Firestore] First attempt failed, retrying...', err.message);
        try {
            return await fn();
        } catch (retryErr) {
            console.warn('[Firestore] Retry also failed:', retryErr.message);
        }
    }
}

// ============ USER & CHALLENGE OPERATIONS ============

/**
 * Register or get a base user profile.
 */
export async function registerParticipant({ name, email, phone }) {
    const docId = phone && phone.trim() ? sanitizePhone(phone) : email.toLowerCase().trim();

    return await withRetry(async () => {
        const docRef = doc(db, USERS, docId);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
            return { id: docId, ...snap.data() };
        }

        const newData = {
            name,
            email,
            phone: phone || '',
            selectedHabits: [],
            createdAt: serverTimestamp(),
        };
        await setDoc(docRef, newData);
        return { id: docId, ...newData };
    });
}

/**
 * Update selected habits list for a user.
 */
export async function updateSelectedHabits(userId, selectedHabits) {
    return await withRetry(async () => {
        const docRef = doc(db, USERS, userId);
        await updateDoc(docRef, { selectedHabits });
    });
}

/**
 * Update the user's active challenge in their user profile document.
 */
export async function updateUserActiveChallenge(userId, activeChallengeId) {
    return await withRetry(async () => {
        const docRef = doc(db, USERS, userId);
        await updateDoc(docRef, { activeChallengeId });
    });
}


export async function updateChallengeHabits(userId, challengeId, selectedHabits) {
    const docId = `${userId}_${challengeId}`;
    return await withRetry(async () => {
        const docRef = doc(db, USER_CHALLENGES, docId);
        await updateDoc(docRef, { selectedHabits });
    });
}

export async function joinChallenge(userId, challengeId, startDate, selectedHabits = []) {
    const docId = `${userId}_${challengeId}`;

    return await withRetry(async () => {
        const docRef = doc(db, USER_CHALLENGES, docId);
        const snap = await getDoc(docRef);

        let joinedData;
        if (snap.exists()) {
            const data = snap.data();
            const updates = {};
            if (!data.startDate && startDate) {
                updates.startDate = startDate;
            }
            if ((!data.selectedHabits || data.selectedHabits.length === 0) && selectedHabits.length > 0) {
                updates.selectedHabits = selectedHabits;
            }
            if (Object.keys(updates).length > 0) {
                await updateDoc(docRef, updates);
                Object.assign(data, updates);
            }
            joinedData = { id: docId, ...data };
        } else {
            const newData = {
                userId,
                challengeId,
                startDate,
                completedDays: {},
                reflections: {},
                habitCompletions: {},
                selectedHabits,
                createdAt: serverTimestamp(),
            };
            await setDoc(docRef, newData);
            joinedData = { id: docId, ...newData };
        }

        // Also update the activeChallengeId in the primary USERS profile document for cross-device syncing
        const userRef = doc(db, USERS, userId);
        await updateDoc(userRef, { activeChallengeId: challengeId }).catch(err => {
            console.warn('[Firestore] Failed to update user activeChallengeId:', err);
        });

        return joinedData;
    });
}

/**
 * Load user profile AND all their joined challenges.
 */
export async function getParticipant(userId) {
    if (!userId) return null;

    // 1. Get user profile
    const userRef = doc(db, USERS, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        return null;
    }

    // 2. Get their challenges (capped to 50 to prevent unbounded scaling issues)
    const q = query(
        collection(db, USER_CHALLENGES),
        where('userId', '==', userId),
        limit(50)
    );
    const challengeSnaps = await getDocs(q);

    const challenges = {};
    challengeSnaps.forEach((docSnap) => {
        const data = docSnap.data();
        challenges[data.challengeId] = {
            startDate: data.startDate,
            completedDays: data.completedDays || {},
            reflections: data.reflections || {},
            habitCompletions: data.habitCompletions || {},
            selectedHabits: data.selectedHabits || [],
        };
    });

    return {
        id: userId,
        ...userSnap.data(),
        challenges // e.g. { "sampurna_swasthya": { startDate, completedDays, habitCompletions } }
    };
}

/**
 * Mark a day as completed with reflection data for a Specific Challenge.
 */
export async function completeDay(userId, challengeId, dateISO, feeling, thought, habitCompletions = null, isAnyCompleted = true) {
    const docId = `${userId}_${challengeId}`;

    await withRetry(async () => {
        const docRef = doc(db, USER_CHALLENGES, docId);
        try {
            const updates = {};
            if (habitCompletions !== null) {
                updates[`habitCompletions.${dateISO}`] = habitCompletions;
            }
            
            if (isAnyCompleted) {
                updates[`completedDays.${dateISO}`] = true;
                updates.completedDatesArray = arrayUnion(dateISO);
            } else {
                updates[`completedDays.${dateISO}`] = false;
            }
            
            if (feeling || thought) {
                updates[`reflections.${dateISO}`] = { feeling, thought };
            }

            await updateDoc(docRef, updates);
        } catch (err) {
            // Fallback: If document doesn't exist yet (created offline), use setDoc
            const newData = {
                userId,
                challengeId,
                completedDays: { [dateISO]: isAnyCompleted },
                completedDatesArray: isAnyCompleted ? [dateISO] : [],
                reflections: (feeling || thought) ? { [dateISO]: { feeling, thought } } : {},
                habitCompletions: habitCompletions ? { [dateISO]: habitCompletions } : {},
                createdAt: serverTimestamp(),
            };
            await setDoc(docRef, newData, { merge: true });
        }
    });
}

/**
 * Sync all local offline challenge progress to Firestore in a single batch
 */
export async function syncOfflineChallenges(userId, localChallenges, remoteChallenges) {
    return await withRetry(async () => {
        const batch = writeBatch(db);
        let hasChanges = false;

        for (const [chId, localData] of Object.entries(localChallenges || {})) {
            const remoteData = remoteChallenges?.[chId];
            const docId = `${userId}_${chId}`;
            const docRef = doc(db, USER_CHALLENGES, docId);

            // If completely missing remotely, create it
            if (!remoteData) {
                batch.set(docRef, {
                    userId,
                    challengeId: chId,
                    startDate: localData.startDate,
                    completedDays: localData.completedDays || {},
                    completedDatesArray: Object.keys(localData.completedDays || {}),
                    reflections: localData.reflections || {},
                    habitCompletions: localData.habitCompletions || {},
                    selectedHabits: localData.selectedHabits || [],
                    createdAt: serverTimestamp(),
                });
                hasChanges = true;
            } else {
                // It exists remotely, but we need to merge any missing completedDays
                const missingDays = {};
                const missingReflections = {};
                const missingHabitCompletions = {};
                let needsMerge = false;

                for (const [dateISO, _] of Object.entries(localData.completedDays || {})) {
                    if (!remoteData.completedDays?.[dateISO]) {
                        missingDays[dateISO] = true;
                        if (localData.reflections?.[dateISO]) {
                            missingReflections[dateISO] = localData.reflections[dateISO];
                        }
                        if (localData.habitCompletions?.[dateISO]) {
                            missingHabitCompletions[dateISO] = localData.habitCompletions[dateISO];
                        }
                        needsMerge = true;
                    }
                }

                const updates = {};
                if (needsMerge) {
                    updates.completedDays = missingDays;
                    updates.completedDatesArray = arrayUnion(...Object.keys(missingDays));
                    updates.reflections = missingReflections;
                    updates.habitCompletions = missingHabitCompletions;
                }

                // Also merge selectedHabits if they exist locally but not remotely (or mismatch)
                if (localData.selectedHabits?.length > 0 && (!remoteData.selectedHabits || remoteData.selectedHabits.length === 0)) {
                    updates.selectedHabits = localData.selectedHabits;
                }

                if (Object.keys(updates).length > 0) {
                    batch.set(docRef, updates, { merge: true });
                    hasChanges = true;
                }
            }
        }

        if (hasChanges) {
            await batch.commit();
        }
        return hasChanges;
    });
}


// ============ COMMUNITY COUNT ============

export async function countCompletedToday(dateISO) {
    const now = Date.now();
    // Cache daily count heavily (especially helpful on dashboard re-renders)
    if (cache.communityCounts.daily !== null && (now - cache.communityCounts.dailyTimestamp < CACHE_TTL_MS)) {
        return cache.communityCounts.daily;
    }

    try {
        const q = query(
            collection(db, USER_CHALLENGES),
            where('completedDatesArray', 'array-contains', dateISO)
        );
        const snapshot = await getCountFromServer(q);
        const count = snapshot.data().count;
        cache.communityCounts.daily = count;
        cache.communityCounts.dailyTimestamp = now;
        return count;
    } catch {
        return cache.communityCounts.daily || 0;
    }
}

export async function getTotalParticipants() {
    const now = Date.now();
    if (cache.communityCounts.total !== null && (now - cache.communityCounts.totalTimestamp < CACHE_TTL_MS)) {
        return cache.communityCounts.total;
    }

    try {
        const snapshot = await getCountFromServer(collection(db, USERS));
        const count = snapshot.data().count;
        cache.communityCounts.total = count;
        cache.communityCounts.totalTimestamp = now;
        return count;
    } catch {
        return cache.communityCounts.total || 0;
    }
}

/**
 * Fetch all available challenges defined by the Admin Panel
 */
export async function fetchChallenges() {
    const now = Date.now();
    if (cache.challenges.data && (now - cache.challenges.timestamp < CACHE_TTL_MS)) {
        return cache.challenges.data;
    }

    return await withRetry(async () => {
        // Limit total challenges downloaded to prevent unbounded read growth
        const q = query(collection(db, CHALLENGES), limit(100));
        const querySnapshot = await getDocs(q);
        const fetched = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.isActive !== false) {
                fetched.push({ id: docSnap.id, ...data });
            }
        });
        cache.challenges.data = fetched;
        cache.challenges.timestamp = now;
        return fetched;
    });
}

/**
 * Fetch global app settings (Daily Wisdom, Hindi Translations, etc.)
 */
export async function fetchAdminSettings() {
    const now = Date.now();
    if (cache.adminSettings.data && (now - cache.adminSettings.timestamp < CACHE_TTL_MS)) {
        return cache.adminSettings.data;
    }

    return await withRetry(async () => {
        const docRef = doc(db, ADMIN_SETTINGS, 'content_management');
        const snap = await getDoc(docRef);
        const data = snap.exists() ? snap.data() : null;
        if (data) {
            cache.adminSettings.data = data;
            cache.adminSettings.timestamp = now;
        }
        return data;
    });
}
