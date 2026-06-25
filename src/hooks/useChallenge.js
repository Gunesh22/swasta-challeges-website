import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AVAILABLE_CHALLENGES, INITIAL_STATE, HOLISTIC_HABITS } from '../constants';
import { loadState, saveState, clearState, loadPendingSyncs, enqueueSync, dequeueSyncs, clearPendingSyncs } from '../utils/storage';
import { getTodayISO, getCurrentDay, getDateForDay } from '../utils/dateHelpers';
import * as firestore from '../services/firestore';

export function useChallenge() {
    const [state, setState] = useState(() => loadState());
    const [availableChallenges, setAvailableChallenges] = useState(AVAILABLE_CHALLENGES);
    const [adminSettings, setAdminSettings] = useState(null);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isPreparingCertificate, setIsPreparingCertificate] = useState(false);
    const debounceTimeoutRef = useRef(null);
    const certificatePdfBytes = useRef(null);
    const certificateFontBytes = useRef(null);

    const dismissSavingLoader = useCallback(() => {
        setIsSaving(false);
    }, []);

    const userKey = state.userId || state.phone || state.email;

    // Sync from Firestore on mount
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                // 1. Fetch Admin Constants (Challenges + Quotes)
                const [challenges, settings] = await Promise.all([
                    firestore.fetchChallenges(),
                    firestore.fetchAdminSettings()
                ]);

                if (!cancelled) {
                    if (challenges?.length > 0) setAvailableChallenges(challenges);
                    if (settings) setAdminSettings(settings);
                }

                // 2. Fetch User Profile & Auto-Sync
                const latestState = await new Promise(resolve => {
                    setState(prev => { resolve(prev); return prev; });
                });

                const currentUserId = latestState.userId || latestState.phone || latestState.email;

                if (currentUserId) {
                    let remote = await firestore.getParticipant(currentUserId);

                    // Recover missing remote profile (if they registered while blocked/offline)
                    if (!remote && latestState.name) {
                        remote = await firestore.registerParticipant({
                            name: latestState.name,
                            email: latestState.email,
                            phone: latestState.phone
                        });
                    }

                    if (remote && !cancelled) {
                        // Push any local challenges/progress that didn't make it to Firebase
                        if (latestState.challenges) {
                            await firestore.syncOfflineChallenges(
                                currentUserId,
                                latestState.challenges,
                                remote.challenges || {}
                            ).catch(console.warn);
                        }

                        // Drain any pending retry queue items from previous failed writes
                        await drainPendingSyncs();

                        // Merge remote into state using functional updater to avoid stale data
                        setState(prev => {
                            const merged = { ...prev };
                            if (remote.challenges) {
                                merged.challenges = { ...prev.challenges };
                                for (const [chId, remoteData] of Object.entries(remote.challenges)) {
                                    if (merged.challenges[chId]) {
                                        const localData = merged.challenges[chId];
                                        // Deep merge to ensure local offline progress isn't overwritten by stale remote data
                                        merged.challenges[chId] = {
                                            ...remoteData,
                                            ...localData,
                                            completedDays: { ...remoteData.completedDays, ...localData.completedDays },
                                            reflections: { ...remoteData.reflections, ...localData.reflections },
                                            habitCompletions: { ...remoteData.habitCompletions, ...localData.habitCompletions },
                                            selectedHabits: localData.selectedHabits?.length > 0 ? localData.selectedHabits : (remoteData.selectedHabits || [])
                                        };
                                    } else {
                                        merged.challenges[chId] = remoteData;
                                    }
                                }
                            }
                            if (remote.activeChallengeId) {
                                merged.activeChallengeId = remote.activeChallengeId;
                            }
                            // Keep root selectedHabits in sync with active challenge selection
                            if (merged.activeChallengeId) {
                                if (!merged.challenges) merged.challenges = {};
                                if (!merged.challenges[merged.activeChallengeId]) {
                                    merged.challenges[merged.activeChallengeId] = {};
                                }
                                const challengeHabits = merged.challenges[merged.activeChallengeId].selectedHabits;
                                if (challengeHabits && challengeHabits.length > 0) {
                                    merged.selectedHabits = challengeHabits;
                                } else {
                                    const fallbackHabits = (remote.selectedHabits && remote.selectedHabits.length > 0)
                                        ? remote.selectedHabits
                                        : (prev.selectedHabits || []);
                                    merged.challenges[merged.activeChallengeId].selectedHabits = fallbackHabits;
                                    merged.selectedHabits = fallbackHabits;
                                }
                            } else if (remote.selectedHabits && remote.selectedHabits.length > 0 &&
                                (!Array.isArray(prev.selectedHabits) || prev.selectedHabits.length > 0)) {
                                merged.selectedHabits = remote.selectedHabits;
                            }
                            saveState(merged);
                            return merged;
                        });
                    }
                }
            } catch (err) {
                console.warn('[Sync] Firestore sync failed:', err.message);
            } finally {
                if (!cancelled) setIsDataLoaded(true);
            }
        })();

        return () => { cancelled = true; };
    }, [userKey]);

    // Re-drain the offline sync queue when user returns to the tab (tab becomes visible)
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                drainPendingSyncs();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Flush state to localStorage on page unload (catches cases where setState batching delayed a save)
    useEffect(() => {
        const handleUnload = () => {
            const currentState = loadState();
            // Re-read and re-save to ensure the very latest state is persisted
            saveState({ ...currentState });
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, []);

    // --- Drain pending sync queue (retry failed Firestore writes) ---
    const drainPendingSyncs = useCallback(async () => {
        const pending = loadPendingSyncs();
        if (pending.length === 0) return;

        const succeeded = [];
        for (let i = 0; i < pending.length; i++) {
            const item = pending[i];
            try {
                if (item.type === 'completeDay') {
                    await firestore.completeDay(...item.args);
                } else if (item.type === 'joinChallenge') {
                    await firestore.joinChallenge(...item.args);
                }
                succeeded.push(i);
            } catch (err) {
                console.warn('[RetryQueue] Item still failing, will keep in queue:', err.message);
            }
        }
        if (succeeded.length === pending.length) {
            clearPendingSyncs();
        } else if (succeeded.length > 0) {
            dequeueSyncs(succeeded);
        }
    }, []);

    // --- Persist to localStorage ---
    const persist = useCallback((nextState) => {
        setState(nextState);
        saveState(nextState);
    }, []);

    // --- Register User ---
    const register = useCallback(async (firstName, lastName, email, phone) => {
        const name = `${firstName}  ${lastName}`.trim();
        const userId = phone && phone.trim() ? phone.replace(/\D/g, '') : email.toLowerCase().trim();

        try {
            // First attempt to load participant details to recover profile if they are a returning user
            let remoteUser = await firestore.getParticipant(userId);
            if (!remoteUser) {
                remoteUser = await firestore.registerParticipant({ name, firstName, lastName, email, phone });
            } else {
                // Ensure name and other details are updated on the participant document
                remoteUser = await firestore.registerParticipant({ name, firstName, lastName, email, phone });
            }
            if (remoteUser) {
                const merged = {
                    ...state,
                    registered: true,
                    userId: remoteUser.id,
                    name: name,
                    firstName: remoteUser.firstName || firstName,
                    lastName: remoteUser.lastName || lastName,
                    email: remoteUser.email || email,
                    phone: remoteUser.phone || phone || '',
                    selectedHabits: remoteUser.selectedHabits || [],
                    activeChallengeId: remoteUser.activeChallengeId || null,
                    challenges: remoteUser.challenges || state.challenges || {}
                };
                if (merged.activeChallengeId) {
                    if (!merged.challenges) merged.challenges = {};
                    if (!merged.challenges[merged.activeChallengeId]) {
                        merged.challenges[merged.activeChallengeId] = {};
                    }
                    const challengeHabits = merged.challenges[merged.activeChallengeId].selectedHabits;
                    if (challengeHabits && challengeHabits.length > 0) {
                        merged.selectedHabits = challengeHabits;
                    } else {
                        const fallbackHabits = remoteUser.selectedHabits || state.selectedHabits || [];
                        merged.challenges[merged.activeChallengeId].selectedHabits = fallbackHabits;
                        merged.selectedHabits = fallbackHabits;
                    }
                }
                persist(merged);
                return merged;
            }
        } catch (err) {
            console.warn('[Firestore] Register failed, using local tracking', err);
        }

        const localUser = {
            ...state,
            registered: true,
            userId,
            name,
            email,
            phone: phone || '',
            selectedHabits: [],
            challenges: state.challenges || {}
        };
        persist(localUser);
        return localUser;
    }, [state, persist]);

    // --- Update selected habits ---
    const saveSelectedHabits = useCallback(async (selectedHabits) => {
        const activeId = state.activeChallengeId;
        if (!activeId) return;

        const next = { 
            ...state, 
            selectedHabits,
            challenges: {
                ...state.challenges,
                [activeId]: {
                    ...(state.challenges[activeId] || {}),
                    selectedHabits
                }
            }
        };
        persist(next);
        const currentUserId = state.userId || state.phone || state.email;
        if (currentUserId) {
            await firestore.updateSelectedHabits(currentUserId, selectedHabits).catch(console.warn);
            await firestore.updateChallengeHabits(currentUserId, activeId, selectedHabits).catch(console.warn);
        }
    }, [state, persist]);

    // --- Join Challenge ---
    const joinSpecificChallenge = useCallback(async (challengeId) => {
        const today = getTodayISO();
        const def = availableChallenges.find(c => c.id === challengeId);

        let actualStartDate = today;
        if (def && def.startType === 'cohort' && def.startDate) {
            actualStartDate = def.startDate;
        }

        const challengeHabits = def?.habits?.length > 0
            ? def.habits
            : (adminSettings?.habits?.length > 0 ? adminSettings.habits : HOLISTIC_HABITS);

        const habitCount = def?.habitCount;
        const targetHabitCount = habitCount > 0
            ? Math.min(habitCount, challengeHabits.length)
            : Math.min(5, challengeHabits.length);

        let selectedHabits = [];
        if (challengeHabits.length > 0 && targetHabitCount === challengeHabits.length) {
            selectedHabits = challengeHabits.map(h => h.id);
        }

        // Local immediately
        const next = { ...state, activeChallengeId: challengeId, selectedHabits };
        if (!next.challenges) next.challenges = {};
        if (!next.challenges[challengeId]) {
            next.challenges[challengeId] = {
                startDate: actualStartDate,
                completedDays: {},
                reflections: {},
                habitCompletions: {},
                selectedHabits
            };

            const currentUserId = state.userId || state.phone || state.email;
            if (currentUserId) {
                firestore.joinChallenge(currentUserId, challengeId, actualStartDate, selectedHabits).catch(() => {
                    enqueueSync('joinChallenge', [currentUserId, challengeId, actualStartDate, selectedHabits]);
                });
                firestore.updateUserActiveChallenge(currentUserId, challengeId).catch(console.warn);
                if (selectedHabits.length > 0) {
                    firestore.updateSelectedHabits(currentUserId, selectedHabits).catch(console.warn);
                }
            }
        } else {
            const currentUserId = state.userId || state.phone || state.email;
            if (currentUserId) {
                firestore.updateUserActiveChallenge(currentUserId, challengeId).catch(console.warn);
            }
        }

        persist(next);
    }, [state, persist, availableChallenges, adminSettings]);

    // --- Save Habits and Join Challenge atomically ---
    const saveHabitsAndJoinChallenge = useCallback(async (selectedHabits, challengeId) => {
        const today = getTodayISO();
        const def = availableChallenges.find(c => c.id === challengeId);

        let actualStartDate = today;
        if (def && def.startType === 'cohort' && def.startDate) {
            actualStartDate = def.startDate;
        }

        const next = { 
            ...state, 
            selectedHabits, 
            activeChallengeId: challengeId 
        };
        if (!next.challenges) next.challenges = {};
        next.challenges[challengeId] = {
            ...(next.challenges[challengeId] || {
                completedDays: {},
                reflections: {},
                habitCompletions: {}
            }),
            startDate: actualStartDate,
            selectedHabits
        };

        persist(next);

        const currentUserId = state.userId || state.phone || state.email;
        if (currentUserId) {
            firestore.updateSelectedHabits(currentUserId, selectedHabits).catch(console.warn);
            firestore.updateUserActiveChallenge(currentUserId, challengeId).catch(console.warn);
            firestore.joinChallenge(currentUserId, challengeId, actualStartDate, selectedHabits).catch(() => {
                enqueueSync('joinChallenge', [currentUserId, challengeId, actualStartDate, selectedHabits]);
            });
        }
    }, [state, persist, availableChallenges]);

    // --- Select Active Challenge ---
    // Clears selectedHabits ONLY if there are no existing habits for that challenge.
    // Otherwise, restores existing habits.
    const selectChallenge = useCallback((challengeId) => {
        const def = availableChallenges.find(c => c.id === challengeId);
        const challengeHabits = def?.habits?.length > 0
            ? def.habits
            : (adminSettings?.habits?.length > 0 ? adminSettings.habits : HOLISTIC_HABITS);

        const existing = state.challenges?.[challengeId]?.selectedHabits || [];
        
        let hasValidHabits = false;
        const habitCount = def?.habitCount;
        const targetHabitCount = habitCount > 0
            ? Math.min(habitCount, challengeHabits.length)
            : Math.min(5, challengeHabits.length);

        if (challengeHabits.length > 0) {
            hasValidHabits = existing &&
                existing.length >= targetHabitCount &&
                existing.every(id => challengeHabits.some(h => h.id === id));
        } else {
            hasValidHabits = existing && existing.length > 0;
        }

        let restoredHabits = [];
        if (challengeHabits.length > 0 && targetHabitCount === challengeHabits.length) {
            restoredHabits = challengeHabits.map(h => h.id);
        } else if (hasValidHabits) {
            restoredHabits = existing;
        }

        const next = {
            ...state,
            activeChallengeId: challengeId,
            selectedHabits: restoredHabits
        };
        persist(next);

        const currentUserId = state.userId || state.phone || state.email;
        if (currentUserId) {
            firestore.updateSelectedHabits(currentUserId, restoredHabits).catch(console.warn);
            firestore.updateUserActiveChallenge(currentUserId, challengeId).catch(console.warn);
        }
    }, [state, persist, availableChallenges, adminSettings]);

    // --- Active Challenge Derived Data ---
    const activeChallengeDef = useMemo(() => availableChallenges.find(c => c.id === state.activeChallengeId), [state.activeChallengeId, availableChallenges]);
    const activeData = state.challenges && state.activeChallengeId ? state.challenges[state.activeChallengeId] : null;

    const totalDays = activeChallengeDef ? (Number(activeChallengeDef.durationDays) || Number(activeChallengeDef.totalDays) || 21) : 21;

    // Raw current day (can exceed totalDays if the user is past the end)
    const rawCurrentDay = useMemo(() => activeData ? getCurrentDay(activeData.startDate) : 1, [activeData]);
    // Clamped for UI display (never shows > totalDays)
    const clampedCurrentDay = Math.min(rawCurrentDay, totalDays);

    const completedCount = useMemo(() => activeData ? Object.keys(activeData.completedDays || {}).filter(date => activeData.completedDays[date]).length : 0, [activeData]);
    const isChallengeComplete = completedCount >= totalDays;

    // Grace period: allow up to 2 days after the challenge ends so users
    // who missed the last day(s) can still catch up before being marked "failed"
    const GRACE_PERIOD_DAYS = 2;
    const isChallengeFailed = rawCurrentDay > (totalDays + GRACE_PERIOD_DAYS) && !isChallengeComplete;

    // --- Check if a day is allowed to be completed ---
    // Only current day and up to 2 past days can be marked. Future days are blocked.
    // During grace period, days up to totalDays remain completable.
    const MAX_PAST_DAYS_ALLOWED = 2;

    const isDayAllowed = useCallback((dayNum) => {
        if (!activeData) return false;

        // Open all days only for user 0000011111
        const currentUserId = state.userId || state.phone || state.email;
        const currentEmail = state.email || '';
        const currentName = state.name || '';
        if (
            currentUserId === '0000011111' || 
            currentEmail.toLowerCase() === 'f@gmail.com' ||
            currentName.toLowerCase() === 'testf testl'
        ) {
            return dayNum >= 1 && dayNum <= totalDays;
        }

        if (isChallengeComplete || isChallengeFailed) return false;
        // The effective "head" day — within grace period, cap at totalDays
        const effectiveCurrent = Math.min(rawCurrentDay, totalDays);
        // Must be within range: (effectiveCurrent - MAX_PAST_DAYS_ALLOWED) to effectiveCurrent
        if (dayNum > effectiveCurrent) return false; // future day blocked
        if (dayNum < effectiveCurrent - MAX_PAST_DAYS_ALLOWED) return false; // too far in the past
        if (dayNum < 1) return false;
        return true;
    }, [activeData, totalDays, rawCurrentDay, isChallengeComplete, isChallengeFailed, state.userId, state.phone, state.email, state.name]);

    // --- Complete a day ---
    const completeDay = useCallback(async (dayNum, feeling, thought, habitCompletions = null) => {
        if (!activeData || !state.activeChallengeId) return;

        // Enforce: only current day ± 2 past days allowed
        if (!isDayAllowed(dayNum)) return;

        const dateForDay = getDateForDay(activeData.startDate, dayNum);
        if (!dateForDay) return;

        const challengeId = state.activeChallengeId;
        const currentChallenge = state.challenges[challengeId];

        const selectedHabits = currentChallenge.selectedHabits || state.selectedHabits || [];
        const activeCompletions = habitCompletions || (currentChallenge.habitCompletions && currentChallenge.habitCompletions[dateForDay]) || {};
        const isAnyCompleted = selectedHabits.length > 0
            ? selectedHabits.some(id => activeCompletions[id] === true)
            : false;

        const next = {
            ...state,
            challenges: {
                ...state.challenges,
                [challengeId]: {
                    ...currentChallenge,
                    completedDays: {
                        ...(currentChallenge.completedDays || {}),
                        [dateForDay]: isAnyCompleted,
                    },
                    reflections: {
                        ...(currentChallenge.reflections || {}),
                        [dateForDay]: { feeling, thought }
                    },
                    habitCompletions: {
                        ...(currentChallenge.habitCompletions || {}),
                        [dateForDay]: habitCompletions
                    }
                }
            }
        };

        // Always update local state immediately for instant UI response
        persist(next);

        const currentUserId = state.userId || state.phone || state.email;

        // Clear any existing debounce timer
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        // Normal habit check: debounce writing to Firestore by 3 seconds
        if (currentUserId) {
            debounceTimeoutRef.current = setTimeout(() => {
                firestore.completeDay(currentUserId, challengeId, dateForDay, feeling, thought, habitCompletions, isAnyCompleted).catch((err) => {
                    console.warn('[Debounce] Background save failed, queuing offline sync', err);
                    enqueueSync('completeDay', [currentUserId, challengeId, dateForDay, feeling, thought, habitCompletions, isAnyCompleted]);
                });
            }, 3000);
        }
    }, [state, activeData, persist, isDayAllowed, totalDays]);

    // --- Reset ---
    const resetChallenge = useCallback(() => {
        clearState();
        clearPendingSyncs(); // Prevent stale queued writes from replaying for a different user
        setState({ ...INITIAL_STATE });
    }, []);

    // --- Check day ---
    const isDayCompleted = useCallback((dayNum) => {
        if (!activeData) return false;
        const dateForDay = getDateForDay(activeData.startDate, dayNum);
        return dateForDay ? !!(activeData.completedDays && activeData.completedDays[dateForDay]) : false;
    }, [activeData]);

    const startPreparingCertificate = useCallback(() => {
        setIsSaving(true);
        setIsPreparingCertificate(true);

        // Start background preloading of certificate template and font
        (async () => {
            try {
                const promises = [];
                if (!certificatePdfBytes.current) {
                    promises.push(
                        fetch('/certificate-template.pdf')
                            .then(res => {
                                if (!res.ok) throw new Error("PDF load failed");
                                return res.arrayBuffer();
                            })
                            .then(bytes => {
                                certificatePdfBytes.current = bytes;
                            })
                    );
                }
                if (!certificateFontBytes.current) {
                    const fontUrl = 'https://fonts.gstatic.com/s/alexbrush/v22/SZc83FzrJKuqFbwMKk6EtUL57DtOmCc.ttf';
                    promises.push(
                        fetch(fontUrl)
                            .then(res => {
                                if (!res.ok) throw new Error("Font load failed");
                                return res.arrayBuffer();
                            })
                            .then(bytes => {
                                certificateFontBytes.current = bytes;
                            })
                    );
                }
                promises.push(document.fonts.load('44px "Alex Brush"'));
                await Promise.all(promises);
            } catch (err) {
                console.warn('[Preload] Failed to pre-fetch certificate files in background:', err);
            }
        })();

        setTimeout(() => {
            setIsPreparingCertificate(false);
        }, 3000);
    }, []);

    return {
        state,
        activeData,
        activeChallengeDef,
        availableChallenges,
        adminSettings,
        totalDays,
        currentDay: clampedCurrentDay,
        completedCount,
        isChallengeComplete,
        isChallengeFailed,
        isDataLoaded,
        register,
        saveSelectedHabits,
        joinSpecificChallenge,
        saveHabitsAndJoinChallenge,
        selectChallenge,
        completeDay,
        resetChallenge,
        isDayCompleted,
        isDayAllowed,
        isSaving,
        isPreparingCertificate,
        dismissSavingLoader,
        startPreparingCertificate,
        certificatePdfBytes,
        certificateFontBytes
    };
}
