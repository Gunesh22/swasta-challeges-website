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
        isDataLoaded,
        adminSettings,
        activeChallengeDef
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

    // Target count is exactly 5, or total available habits if less than 5
    const targetHabitCount = useMemo(() => {
        return Math.min(5, allHabits.length);
    }, [allHabits]);

    // Initial selected state from context (if any exist already)
    const [selected, setSelected] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const isFromLogin = location.state?.fromLogin;

    // Sync state.selectedHabits to local selection state
    useEffect(() => {
        if (isDataLoaded && state.selectedHabits) {
            const hasValidHabits = state.selectedHabits.length === targetHabitCount && 
                state.selectedHabits.every(id => allHabits.some(h => h.id === id));
            if (hasValidHabits) {
                setSelected([...state.selectedHabits]);
            } else if (allHabits.length <= 5) {
                // If total available habits is 5 or less, pre-select all of them automatically
                setSelected(allHabits.map(h => h.id));
            } else {
                // Let them keep any subset of previously selected habits that are still valid in the new catalog
                const stillValid = state.selectedHabits.filter(id => allHabits.some(h => h.id === id));
                setSelected(stillValid);
            }
        }
    }, [isDataLoaded, state.selectedHabits, targetHabitCount, allHabits]);

    // If data loaded and user already has exactly targetHabitCount valid habits selected, and they didn't just come from registration/login, redirect to dashboard
    useEffect(() => {
        if (isDataLoaded && state.selectedHabits && !isFromLogin) {
            const hasValidHabits = state.selectedHabits.length === targetHabitCount && 
                state.selectedHabits.every(id => allHabits.some(h => h.id === id));
            if (hasValidHabits) {
                navigate('/dashboard', { replace: true });
            }
        }
    }, [isDataLoaded, state.selectedHabits, navigate, isFromLogin, targetHabitCount, allHabits]);

    const handleToggle = useCallback((habitId) => {
        setSelected(prev => {
            if (prev.includes(habitId)) {
                return prev.filter(id => id !== habitId);
            } else {
                if (prev.length >= targetHabitCount) {
                    return prev; // Max allowed reached
                }
                return [...prev, habitId];
            }
        });
    }, [targetHabitCount]);

    const handleContinue = useCallback(async () => {
        if (selected.length !== targetHabitCount) return;
        
        setIsSaving(true);
        
        try {
            // Save selected habits to local state & firebase
            await saveSelectedHabits(selected);
            
            // Join the holistic challenge automatically
            await joinSpecificChallenge('sampurna_swasthya');
            
            // Delay navigation slightly to let the user breathe and absorb the transition quotes
            setTimeout(() => {
                navigate('/dashboard', { replace: true });
            }, 2200);
        } catch (err) {
            console.error(err);
            setIsSaving(false);
        }
    }, [selected, saveSelectedHabits, joinSpecificChallenge, navigate, targetHabitCount]);

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
            <div className="welcome-bg">
                <div className="welcome-content loading-content">
                    <div className="lotus-icon spin-slow">🪷</div>
                    <h2 className="loading-title fade-in">Aligning your chosen practices...</h2>
                    <p className="loading-subtitle fade-in delay-1">
                        "Consistency is the path to inner alignment. Please breathe deeply as we build your daily holistic challenge sanctuary."
                    </p>
                </div>
            </div>
        );
    }

    const progressPercent = targetHabitCount > 0 ? Math.min((selected.length / targetHabitCount) * 100, 100) : 100;

    return (
        <div className="habit-selection-bg">
            {/* Top Bar */}
            <header className="selection-header">
                <div className="header-brand">
                    <span className="brand-lotus">🪷</span>
                    <span className="brand-text">Sampurna Swasthya</span>
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
                    <h2 className="intro-title">Choose Your Core {targetHabitCount}</h2>
                    <p className="intro-subtitle">
                        Select exactly {targetHabitCount} daily habits to anchor your routine. Sustainable growth starts with consistency.
                    </p>
                </section>

                {/* Progress Bar Track */}
                <section className="progress-sticky">
                    <div className="progress-label-row">
                        <span className={`progress-count ${selected.length === targetHabitCount ? 'success-count' : ''}`}>
                            {selected.length} of {targetHabitCount} selected
                        </span>
                        <span className={`progress-hint ${selected.length === targetHabitCount ? 'success-hint' : ''}`}>
                            {selected.length === targetHabitCount ? 'Perfect selection!' : `Choose ${targetHabitCount - selected.length} more`}
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
                        const isDisabled = !isSelected && selected.length >= targetHabitCount;

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
                        disabled={selected.length !== targetHabitCount}
                        onClick={handleContinue}
                    >
                        <span>Begin 21-Day Challenge</span>
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                </div>
            </footer>
        </div>
    );
}
