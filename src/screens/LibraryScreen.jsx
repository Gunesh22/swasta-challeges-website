// ===== LibraryScreen (Habit Selection) =====
// Onboarding page where the user selects exactly 5 out of 7 habits

import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useChallengeContext } from '../context/ChallengeContext';
import { HOLISTIC_HABITS } from '../constants';
import './LibraryScreen.css';

export function LibraryScreen() {
    const {
        state,
        saveSelectedHabits,
        joinSpecificChallenge,
        isDataLoaded
    } = useChallengeContext();
    const navigate = useNavigate();
    const location = useLocation();

    // Initial selected state from context (if any exist already)
    const [selected, setSelected] = useState(() => {
        return state.selectedHabits && state.selectedHabits.length === 5 
            ? [...state.selectedHabits] 
            : [];
    });

    const [isSaving, setIsSaving] = useState(false);
    const isFromLogin = location.state?.fromLogin;

    // If data loaded and user already has exactly 5 habits selected, and they didn't just come from registration/login, redirect to dashboard
    useEffect(() => {
        if (isDataLoaded && state.selectedHabits?.length === 5 && !isFromLogin) {
            navigate('/dashboard', { replace: true });
        }
    }, [isDataLoaded, state.selectedHabits, navigate, isFromLogin]);

    const handleToggle = useCallback((habitId) => {
        setSelected(prev => {
            if (prev.includes(habitId)) {
                return prev.filter(id => id !== habitId);
            } else {
                if (prev.length >= 5) {
                    return prev; // Max 5 allowed
                }
                return [...prev, habitId];
            }
        });
    }, []);

    const handleContinue = useCallback(async () => {
        if (selected.length !== 5) return;
        
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
    }, [selected, saveSelectedHabits, joinSpecificChallenge, navigate]);

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

    const progressPercent = Math.min((selected.length / 5) * 100, 100);

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
                    <h2 className="intro-title">Choose Your Core 5</h2>
                    <p className="intro-subtitle">
                        Select exactly 5 habits to anchor your daily routine. Sustainable growth starts with consistency.
                    </p>
                </section>

                {/* Progress Bar Track */}
                <section className="progress-sticky">
                    <div className="progress-label-row">
                        <span className={`progress-count ${selected.length === 5 ? 'success-count' : ''}`}>
                            {selected.length} of 5 selected
                        </span>
                        <span className={`progress-hint ${selected.length === 5 ? 'success-hint' : ''}`}>
                            {selected.length === 5 ? 'Perfect selection!' : `Choose ${5 - selected.length} more`}
                        </span>
                    </div>
                    <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                </section>

                {/* Habit Grid */}
                <div className="habit-grid">
                    {HOLISTIC_HABITS.map((habit) => {
                        const isSelected = selected.includes(habit.id);
                        const isDisabled = !isSelected && selected.length >= 5;

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
                        disabled={selected.length !== 5}
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
