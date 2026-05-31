// ===== ChallengeContext =====
// Provides challenge state and actions to the entire component tree.

import { createContext, useContext, useState, useCallback } from 'react';
import { useChallenge } from '../hooks/useChallenge';
import { useStreak } from '../hooks/useStreak';

const ChallengeContext = createContext(null);

export function ChallengeProvider({ children }) {
    const challenge = useChallenge();
    const streak = useStreak(
        challenge.activeData?.completedDays || {},
        challenge.activeData?.startDate || null,
        challenge.totalDays,
        challenge.currentDay
    );

    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('tgf_challenge_language') || 'en';
    });

    const toggleLanguage = useCallback(() => {
        setLanguage(prev => {
            const nextLang = prev === 'en' ? 'hi' : 'en';
            localStorage.setItem('tgf_challenge_language', nextLang);
            return nextLang;
        });
    }, []);

    const value = {
        ...challenge,
        streak,
        language,
        toggleLanguage,
    };

    return (
        <ChallengeContext.Provider value={value}>
            {children}
        </ChallengeContext.Provider>
    );
}

/**
 * Hook to consume challenge context.
 * Must be used within <ChallengeProvider>.
 */
export function useChallengeContext() {
    const ctx = useContext(ChallengeContext);
    if (!ctx) {
        throw new Error('useChallengeContext must be used within ChallengeProvider');
    }
    return ctx;
}
