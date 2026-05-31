// ===== ChallengeSelectionScreen =====
// Discover and select from active challenges configured in the Admin panel.

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChallengeContext } from '../context/ChallengeContext';
import './ChallengeSelectionScreen.css';

export function ChallengeSelectionScreen() {
    const {
        availableChallenges,
        selectChallenge,
        state,
        language,
        toggleLanguage,
        isDataLoaded
    } = useChallengeContext();

    const navigate = useNavigate();

    // Only active challenges (isActive !== false)
    const activeChallengesList = useMemo(() => {
        return (availableChallenges || []).filter(c => c.isActive !== false);
    }, [availableChallenges]);

    const handleSelectChallenge = (challengeId) => {
        const isSameChallengeWithHabits =
            state.activeChallengeId === challengeId &&
            state.selectedHabits?.length > 0;

        if (isSameChallengeWithHabits) {
            // Re-tapping the already-active challenge — just go to dashboard
            navigate('/dashboard', { replace: true });
            return;
        }

        // Every NEW challenge always gets a fresh habit selection.
        // selectChallenge sets the ID and clears selectedHabits.
        selectChallenge(challengeId);
        navigate('/library', { state: { fromChallenges: true } });
    };

    if (!isDataLoaded) {
        return (
            <div className="challenge-select-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-dark)' }}>
                <div className="loading-container" style={{ textAlign: 'center', color: '#fff' }}>
                    <div className="lotus-icon spin" style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🪷</div>
                    <p style={{ fontFamily: '"Outfit", sans-serif', opacity: 0.8, letterSpacing: '0.5px' }}>
                        {language === 'hi' ? 'चुनौतियों को लोड किया जा रहा है...' : 'Discovering active challenges...'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="challenge-select-bg">
            {/* Navigation / Header */}
            <header className="dashboard-appbar">
                <div className="appbar-brand">
                    <span className="brand-lotus">🪷</span>
                    <div className="brand-text">
                        <h2>TGF Wellness</h2>
                        <p>{language === 'hi' ? 'अपनी चुनौती चुनें' : 'Choose Your Path'}</p>
                    </div>
                </div>
                <div className="appbar-controls">
                    <button className="lang-toggle-badge" onClick={toggleLanguage}>
                        {language === 'en' ? 'अ / A' : 'A / अ'}
                    </button>
                </div>
            </header>

            <main className="challenge-select-content animate-fade-in">
                {/* Hero Headline */}
                <div className="challenge-select-hero">
                    <h1 className="hero-title">
                        {language === 'hi' ? 'एक नई शुरुआत चुनें' : 'Select Your Journey'}
                    </h1>
                    <p className="hero-subtitle">
                        {language === 'hi'
                            ? 'आपके शारीरिक, मानसिक और आध्यात्मिक स्वास्थ्य के लिए तेज़ ज्ञान फाउंडेशन की पहल।'
                            : 'A transformational wellness pledge designed to align your mind, body, and spirit.'}
                    </p>
                </div>

                {/* Challenges Grid */}
                <div className="challenges-grid">
                    {activeChallengesList.length === 0 ? (
                        <div className="no-challenges-card">
                            <span className="material-symbols-outlined icon-alert">event_busy</span>
                            <p>{language === 'hi' ? 'कोई सक्रिय चुनौती नहीं मिली।' : 'No active challenges available at the moment. Please check back soon!'}</p>
                        </div>
                    ) : (
                        activeChallengesList.map(challenge => {
                            const duration = challenge.durationDays || challenge.totalDays || 21;
                            const challengeIcon = challenge.icon || '🧘';

                            return (
                                <div key={challenge.id} className="challenge-premium-card">
                                    <div className="card-shine" />

                                    {/* Icon */}
                                    <div className="challenge-icon-box">
                                        <span>{challengeIcon}</span>
                                    </div>

                                    {/* Title + days + start date */}
                                    <div className="challenge-card-body">
                                        <div className="challenge-title">{challenge.title}</div>
                                        <div className="challenge-card-meta">
                                            <span className="challenge-duration-badge">
                                                {duration} {language === 'hi' ? 'दिन' : 'Days'}
                                            </span>
                                            {challenge.startType === 'cohort' && challenge.startDate && (
                                                <span className="challenge-date-badge">
                                                    <span className="material-symbols-outlined" style={{ fontSize: '11px', verticalAlign: 'middle' }}>calendar_today</span>
                                                    {' '}{new Date(challenge.startDate).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short' })}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <div className="challenge-card-footer">
                                        <button
                                            className="btn-join-challenge"
                                            onClick={() => handleSelectChallenge(challenge.id)}
                                        >
                                            {language === 'hi' ? 'जुड़ें' : 'Join'}
                                            <span className="material-symbols-outlined btn-arrow">arrow_forward</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>
        </div>
    );
}
