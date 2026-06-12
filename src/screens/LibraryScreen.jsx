// ===== LibraryScreen (Habit Selection) =====
// Onboarding page where the user selects exactly 5 (or less if not enough exist) out of available habits

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useChallengeContext } from '../context/ChallengeContext';
import { HOLISTIC_HABITS } from '../constants';
import './LibraryScreen.css';

export function LibraryScreen() {
    const {
        state,
        saveSelectedHabits,
        joinSpecificChallenge,
        saveHabitsAndJoinChallenge,
        isDataLoaded,
        adminSettings,
        activeChallengeDef,
        availableChallenges
    } = useChallengeContext();
    const navigate = useNavigate();
    const location = useLocation();

    // Dynamically retrieve habits from current challenge, global settings, or defaults
    const allHabits = useMemo(() => {
        if (activeChallengeDef?.habits && activeChallengeDef.habits.length > 0) {
            return activeChallengeDef.habits;
        }
        return adminSettings?.habits || HOLISTIC_HABITS;
    }, [activeChallengeDef, adminSettings]);

    // Target count: admin-configured habitCount, else min(5, available)
    const targetHabitCount = useMemo(() => {
        if (activeChallengeDef?.habitCount && activeChallengeDef.habitCount > 0) {
            return Math.min(activeChallengeDef.habitCount, allHabits.length);
        }
        return Math.min(5, allHabits.length);
    }, [activeChallengeDef, allHabits]);

    // Initial selected state from context (if any exist already)
    const [selected, setSelected] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const isFromLogin = location.state?.fromLogin;
    const isFromChallenges = location.state?.fromChallenges;

    // Sync state.selectedHabits to local selection state.
    // When arriving from challenge selection (isFromChallenges), always start blank
    // so the user is forced to make an explicit choice.
    useEffect(() => {
        if (isFromChallenges) return;
        if (isDataLoaded && state.selectedHabits) {
            const hasValidHabits = state.selectedHabits.length >= targetHabitCount &&
                state.selectedHabits.every(id => allHabits.some(h => h.id === id));
            if (hasValidHabits) {
                setSelected([...state.selectedHabits]);
            } else {
                // Wrong count or stale habits — always start fresh so user is never locked out
                setSelected([]);
            }
        }
    }, [isDataLoaded, state.selectedHabits, targetHabitCount, allHabits, isFromChallenges]);

    // If data loaded and user already has exactly targetHabitCount valid habits selected,
    // and they didn't just come from registration/login OR challenge selection, redirect to dashboard
    useEffect(() => {
        if (isDataLoaded && state.selectedHabits && !isFromLogin && !isFromChallenges && !isSaving) {
            const hasValidHabits = state.selectedHabits.length >= targetHabitCount && 
                state.selectedHabits.every(id => allHabits.some(h => h.id === id));
            if (hasValidHabits) {
                navigate('/dashboard', { replace: true });
            }
        }
    }, [isDataLoaded, state.selectedHabits, navigate, isFromLogin, isFromChallenges, targetHabitCount, allHabits, isSaving]);

    const handleToggle = useCallback((habitId) => {
        setSelected(prev => {
            if (prev.includes(habitId)) {
                return prev.filter(id => id !== habitId);
            } else {
                return [...prev, habitId];
            }
        });
    }, []);

    const handleContinue = useCallback(async () => {
        if (selected.length < targetHabitCount) return;
        
        setIsSaving(true);
        
        try {
            const challengeId = state.activeChallengeId || (availableChallenges && availableChallenges[0]?.id) || '11_day_intro';
            // Save selected habits and join the selected challenge atomically
            await saveHabitsAndJoinChallenge(selected, challengeId);
            
            // Short delay so the save completes before navigating
            setTimeout(() => {
                navigate('/dashboard', { replace: true });
            }, 400);
        } catch (err) {
            console.error(err);
            setIsSaving(false);
        }
    }, [selected, saveHabitsAndJoinChallenge, navigate, targetHabitCount, state.activeChallengeId]);

    if (!isDataLoaded) {
        return (
            <div className="habit-selection-bg">
                <div className="loading-container">
                    <div className="lotus-icon spin">🪷</div>
                    <p>Preparing your habits...</p>
                </div>
            </div>
        );
    }

    if (isSaving) {
        return (
            <div style={{
                position: 'fixed', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-deep, #f8fafc)'
            }}>
                <div style={{
                    width: 40, height: 40,
                    border: '4px solid rgba(0,107,95,0.15)',
                    borderTopColor: 'var(--primary, #006b5f)',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite'
                }} />
            </div>
        );
    }

    const progressPercent = targetHabitCount > 0 ? Math.min((selected.length / targetHabitCount) * 100, 100) : 100;

    return (
        <div className="habit-selection-bg">
            {/* Top Bar */}
            <header className="selection-header">
                <button
                    className="back-btn"
                    onClick={() => navigate('/challenges')}
                    aria-label="Back to challenges"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="header-brand">
                    <span className="brand-text">
                        {activeChallengeDef?.title || 'Choose Habits'}
                    </span>
                </div>
                <div className="user-profile-badge">
                    <div className="avatar-circle">
                        {state.name ? state.name.charAt(0).toUpperCase() : 'S'}
                    </div>
                </div>
            </header>

            <main className="selection-main">
                {/* Intro Title */}
                <section className="selection-intro">
                    <h2 className="intro-title">Choose Your Core Habits</h2>
                    <p className="intro-subtitle">
                        Select at least {targetHabitCount} daily habits to anchor your routine. Sustainable growth starts with consistency.
                    </p>
                </section>

                {/* Progress Bar Track */}
                <section className="progress-sticky">
                    <div className="progress-label-row">
                        <span className={`progress-count ${selected.length >= targetHabitCount ? 'success-count' : ''}`}>
                            {selected.length} selected (Min {targetHabitCount})
                        </span>
                        <span className={`progress-hint ${selected.length >= targetHabitCount ? 'success-hint' : ''}`}>
                            {selected.length >= targetHabitCount ? 'Perfect selection!' : `Choose ${targetHabitCount - selected.length} more`}
                        </span>
                    </div>
                    <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                </section>

                {/* Habit Grid */}
                <div className="habit-grid">
                    {allHabits.map((habit) => {
                        const isSelected = selected.includes(habit.id);
                        const isDisabled = false;

                        return (
                            <button
                                key={habit.id}
                                className={`habit-card-btn ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled-card' : ''}`}
                                onClick={() => handleToggle(habit.id)}
                                disabled={isDisabled}
                            >
                                <div className="card-left">
                                    <div className={`habit-icon-wrapper ${habit.color}`}>
                                        <span className="material-symbols-outlined">{habit.icon}</span>
                                    </div>
                                    <div className="habit-text-info">
                                        <h4 className="habit-card-name">{habit.name}</h4>
                                        <p className="habit-card-desc">{habit.description}</p>
                                    </div>
                                </div>
                                <div className="card-right">
                                    <span className="material-symbols-outlined check-icon">
                                        {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </main>

            {/* Bottom Continue Button Footer */}
            <footer className="selection-footer">
                <div className="footer-container">
                    <button
                        className="continue-button"
                        disabled={selected.length < targetHabitCount}
                        onClick={handleContinue}
                    >
                        <span>
                            Begin {activeChallengeDef ? `${activeChallengeDef.durationDays || activeChallengeDef.totalDays || 21}-Day` : 'Holistic'} Challenge
                        </span>
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                </div>
            </footer>
        </div>
    );
}
