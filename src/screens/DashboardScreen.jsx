// ===== DashboardScreen =====
// Redesigned premium dual-tab dashboard screen featuring today's habit list,
// interactive completion rings, weekly 3D bars, monthly heatmaps, and reflections.

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChallengeContext } from '../context/ChallengeContext';
import { t } from '../utils/translations';
import { HOLISTIC_HABITS, WISDOMS } from '../constants';
import { getDateForDay, getTodayISO } from '../utils/dateHelpers';

// Modals & Subcomponents
import { CertificateModal } from '../components/modals/CertificateModal';

import './DashboardScreen.css';

export function DashboardScreen() {
    const {
        state,
        currentDay,
        isDayCompleted,
        isDayAllowed,
        isChallengeComplete,
        isChallengeFailed,
        completedCount,
        resetChallenge,
        language,
        toggleLanguage,
        activeChallengeDef,
        totalDays,
        activeData,
        completeDay
    } = useChallengeContext();

    const navigate = useNavigate();
    const scrollContainerRef = useRef(null);
    const toastTimeoutRef = useRef(null);

    // Selected day - defaults to currentDay
    const [selectedDay, setSelectedDay] = useState(currentDay);
    
    // Tab State: 'today' | 'progress' | 'wisdom'
    const [activeTab, setActiveTab] = useState('today');

    // Reflection UI inputs
    const [thoughtText, setThoughtText] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);

    // Toast feedback notification state
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // Modals
    const [showCertificate, setShowCertificate] = useState(false);

    // Toast feedback helper function
    const showFeedback = useCallback((message, type = 'success') => {
        setToast({ show: true, message, type });
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => {
            setToast(prev => ({ ...prev, show: false }));
        }, 3000);
    }, []);

    // Clean up toast timeout on unmount
    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        };
    }, []);

    // Ensure user is signed in and has joined challenge
    useEffect(() => {
        window.scrollTo(0, 0);
        if (!state.registered) {
            navigate('/', { replace: true });
        } else if (!state.activeChallengeId) {
            navigate('/library', { replace: true });
        }
    }, [state.registered, state.activeChallengeId, navigate]);

    // Scroll window to top when tab or day changes to guarantee flawless visibility
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [activeTab, selectedDay]);

    // Sync selected day if the actual current challenge day rolls over
    useEffect(() => {
        setSelectedDay(currentDay);
    }, [currentDay]);

    // Fetch details for the selected day
    const selectedDayData = useMemo(() => {
        if (!activeData || !activeData.startDate) return { dateISO: '', completions: {}, reflection: { feeling: '', thought: '' } };
        const dateISO = getDateForDay(activeData.startDate, selectedDay);
        const completions = (activeData.habitCompletions && activeData.habitCompletions[dateISO]) || {};
        const reflection = (activeData.reflections && activeData.reflections[dateISO]) || { feeling: '', thought: '' };
        return { dateISO, completions, reflection };
    }, [activeData, selectedDay]);

    // Sync thought text when the day changes
    useEffect(() => {
        setThoughtText(selectedDayData.reflection.thought || '');
    }, [selectedDay, selectedDayData.reflection.thought]);

    // Automatically center active day in calendar bar
    useEffect(() => {
        if (scrollContainerRef.current) {
            const activeEl = scrollContainerRef.current.querySelector('.day-dot-active');
            if (activeEl) {
                const containerWidth = scrollContainerRef.current.offsetWidth;
                const activeLeft = activeEl.offsetLeft;
                const activeWidth = activeEl.offsetWidth;
                scrollContainerRef.current.scrollTo({
                    left: activeLeft - containerWidth / 2 + activeWidth / 2,
                    behavior: 'smooth'
                });
            }
        }
    }, [selectedDay, activeTab]);

    // Build lists of the user's selected 5 habits
    const selectedHabitsList = useMemo(() => {
        const selectedIds = state.selectedHabits && state.selectedHabits.length > 0
            ? state.selectedHabits
            : ['water', 'meditate', 'read', 'exercise', 'journal'];
        return selectedIds.map(id => HOLISTIC_HABITS.find(h => h.id === id)).filter(Boolean);
    }, [state.selectedHabits]);

    // Calculate completions for the selected day
    const completedHabitsCount = useMemo(() => {
        const comps = selectedDayData.completions;
        return selectedHabitsList.filter(h => comps[h.id]).length;
    }, [selectedDayData.completions, selectedHabitsList]);

    const completionRate = Math.round((completedHabitsCount / 5) * 100);

    // Toggle a habit check state
    const handleHabitToggle = useCallback((habitId) => {
        if (!isDayAllowed(selectedDay)) return;

        const currentCompletions = selectedDayData.completions;
        const isChecking = !currentCompletions[habitId];
        const newCompletions = {
            ...currentCompletions,
            [habitId]: isChecking
        };

        const habitName = selectedHabitsList.find(h => h.id === habitId)?.name || 'Practice';

        completeDay(
            selectedDay,
            selectedDayData.reflection.feeling || '',
            selectedDayData.reflection.thought || '',
            newCompletions
        );

        if (isChecking) {
            showFeedback(
                language === 'hi'
                    ? `बहुत बढ़िया! आपने "${habitName}" पूरा किया।`
                    : `Wonderful! You completed "${habitName}".`,
                'success'
            );
        } else {
            showFeedback(
                language === 'hi'
                    ? `"${habitName}" को अधूरा चिह्नित किया गया।`
                    : `"${habitName}" marked incomplete.`,
                'info'
            );
        }
    }, [selectedDay, selectedDayData, isDayAllowed, completeDay, selectedHabitsList, language, showFeedback]);

    // Toggle daily feeling/mood emoji
    const handleFeelingSelect = useCallback((emoji) => {
        if (!isDayAllowed(selectedDay)) return;

        completeDay(
            selectedDay,
            emoji,
            selectedDayData.reflection.thought || '',
            selectedDayData.completions
        );

        showFeedback(
            language === 'hi'
                ? 'आपका आज का मूड दर्ज कर लिया गया है!'
                : 'Your wellness mood has been updated!',
            'success'
        );
    }, [selectedDay, selectedDayData, isDayAllowed, completeDay, language, showFeedback]);

    // Save written reflections
    const handleSaveThought = useCallback(() => {
        if (!isDayAllowed(selectedDay)) return;
        setIsSavingNote(true);

        completeDay(
            selectedDay,
            selectedDayData.reflection.feeling || '',
            thoughtText,
            selectedDayData.completions
        );

        setTimeout(() => {
            setIsSavingNote(false);
            showFeedback(
                language === 'hi'
                    ? 'आपके विचार सफलतापूर्वक सुरक्षित कर लिए गए हैं!'
                    : 'Reflection saved to your wellness journal!',
                'success'
            );
        }, 600);
    }, [selectedDay, selectedDayData, thoughtText, isDayAllowed, completeDay, language, showFeedback]);

    // Calculate overall statistics for Progress Tab
    const stats = useMemo(() => {
        if (!activeData) return { totalHabitsDone: 0, adherence: 0 };

        let totalHabitsDone = 0;
        Object.values(activeData.habitCompletions || {}).forEach(dayComps => {
            if (dayComps) {
                selectedHabitsList.forEach(h => {
                    if (dayComps[h.id]) totalHabitsDone++;
                });
            }
        });

        // Adherence relative to elapsed days
        const totalPossible = Math.max(1, currentDay) * 5;
        const adherence = Math.min(100, Math.round((totalHabitsDone / totalPossible) * 100));

        return { totalHabitsDone, adherence };
    }, [activeData, currentDay, selectedHabitsList]);

    // Weekly progress analytics list (last 7 days)
    const weeklyProgressList = useMemo(() => {
        if (!activeData) return [];
        const endDay = Math.min(Math.max(currentDay, 7), totalDays);
        const startDay = Math.max(1, endDay - 6);
        const list = [];

        for (let d = startDay; d <= endDay; d++) {
            const dateISO = getDateForDay(activeData.startDate, d);
            const dayComps = dateISO ? (activeData.habitCompletions?.[dateISO] || {}) : {};
            const count = selectedHabitsList.filter(h => dayComps[h.id]).length;
            
            let label = `D${d}`;
            if (dateISO) {
                label = new Date(dateISO + 'T00:00:00').toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', { weekday: 'short' });
            }

            list.push({
                dayNum: d,
                count,
                percentage: (count / 5) * 100,
                isToday: d === currentDay,
                label
            });
        }
        return list;
    }, [activeData, currentDay, totalDays, selectedHabitsList, language]);

    // Generate full monthly heatmap days (all 21 days)
    const heatmapDays = useMemo(() => {
        const list = [];
        for (let d = 1; d <= 21; d++) {
            const dateISO = activeData?.startDate ? getDateForDay(activeData.startDate, d) : null;
            const dayComps = dateISO ? (activeData?.habitCompletions?.[dateISO] || {}) : {};
            const count = selectedHabitsList.filter(h => dayComps[h.id]).length;
            const completed = activeData?.completedDays?.[dateISO] || false;

            list.push({
                dayNum: d,
                count,
                completed,
                dateISO,
                isToday: d === currentDay
            });
        }
        return list;
    }, [activeData, currentDay, selectedHabitsList]);

    // Habit individual breakdowns
    const habitStatsBreakdown = useMemo(() => {
        if (!activeData) return [];
        return selectedHabitsList.map(h => {
            let doneCount = 0;
            Object.values(activeData.habitCompletions || {}).forEach(dayComps => {
                if (dayComps?.[h.id]) doneCount++;
            });
            const rate = Math.round((doneCount / totalDays) * 100);
            return {
                ...h,
                doneCount,
                rate
            };
        });
    }, [activeData, selectedHabitsList, totalDays]);

    const dailyWisdom = useMemo(() => {
        const idx = (selectedDay - 1) % WISDOMS.length;
        return WISDOMS[idx] || WISDOMS[0];
    }, [selectedDay]);

    const handleLogout = useCallback(() => {
        if (window.confirm(language === 'hi' ? 'क्या आप लॉग आउट करना चाहते हैं?' : 'Are you sure you want to logout?')) {
            resetChallenge();
            navigate('/', { replace: true });
        }
    }, [resetChallenge, navigate, language]);

    return (
        <div className="dashboard-wrapper">
            {/* Top Navigation / Brand Header */}
            <header className="dashboard-appbar">
                <div className="appbar-brand">
                    <span className="brand-lotus">🪷</span>
                    <div className="brand-text">
                        <h2>Sampurna Swasthya</h2>
                        <p>Holistic Health Challenge</p>
                    </div>
                </div>
                <div className="appbar-controls">
                    <button className="lang-toggle-badge" onClick={toggleLanguage}>
                        {language === 'en' ? 'अ / A' : 'A / अ'}
                    </button>
                </div>
            </header>

            {/* Main Visual Tabs Canvas */}
            <main className="dashboard-content">
                
                {/* TAB 1: TODAY'S PRACTICES */}
                {activeTab === 'today' && (
                    <div className="tab-pane animate-fade-in">
                        
                        {/* Rolling Challenge Calendar Row */}
                        <div className="calendar-strip-container">
                            <div className="calendar-strip-header">
                                <h3>{language === 'hi' ? 'दैनिक प्रगति चुनें' : 'Select Challenge Day'}</h3>
                                <span>Day {selectedDay} of {totalDays}</span>
                            </div>
                            <div className="calendar-strip-scroll" ref={scrollContainerRef}>
                                {Array.from({ length: totalDays }, (_, i) => {
                                    const d = i + 1;
                                    const allowed = isDayAllowed(d);
                                    const completed = isDayCompleted(d);
                                    const active = d === selectedDay;

                                    return (
                                        <button
                                            key={d}
                                            className={`day-dot ${active ? 'day-dot-active' : ''} ${completed ? 'day-dot-completed' : ''} ${!allowed ? 'day-dot-locked' : ''}`}
                                            onClick={() => setSelectedDay(d)}
                                        >
                                            <span className="day-dot-number">{d}</span>
                                            {completed && <span className="day-dot-check">✓</span>}
                                            {!allowed && d > currentDay && <span className="day-dot-lock-icon">🔒</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Premium Completion Certificate Banner */}
                        {isChallengeComplete && (
                            <div className="premium-celebration-card">
                                <div className="celebration-shine" />
                                <span className="material-symbols-outlined trophy-glow">workspace_premium</span>
                                <h4>{language === 'hi' ? 'बधाई हो! चुनौती पूरी हुई' : 'Congratulations! Journey Complete'}</h4>
                                <p>{language === 'hi' ? 'आपने संपूर्ण स्वास्थ्य के सभी २१ दिन सफलतापूर्वक पूरे किए हैं!' : 'You have completed all 21 days of Sampurna Swasthya!'}</p>
                                <button className="btn-get-certificate" onClick={() => setShowCertificate(true)}>
                                    {language === 'hi' ? 'प्रमाणपत्र प्राप्त करें' : 'Claim Completion Certificate'}
                                </button>
                            </div>
                        )}

                        {/* Circular Progress Ring Card */}
                        <div className="daily-hero-ring-card">
                            <div className="ring-container">
                                <svg className="progress-ring" viewBox="0 0 100 100">
                                    <circle className="ring-track" cx="50" cy="50" r="42" strokeWidth="6" />
                                    <circle
                                        className="ring-bar"
                                        cx="50"
                                        cy="50"
                                        r="42"
                                        strokeWidth="6"
                                        strokeDasharray="263.89"
                                        strokeDashoffset={263.89 - (completionRate / 100 * 263.89)}
                                    />
                                </svg>
                                <div className="ring-inner-text">
                                    <span className="ring-percent">{completionRate}%</span>
                                    <span className="ring-subtext">{completedHabitsCount} of 5 Done</span>
                                </div>
                            </div>
                            <div className="hero-ring-details">
                                <h3>{language === 'hi' ? 'आज का संपूर्ण स्वास्थ्य' : "Today's Practices"}</h3>
                                <p>{language === 'hi' ? 'अपने ५ चुनिंदा आदतों को चिह्नित करें:' : 'Mark the 5 habits you did today:'}</p>
                            </div>
                        </div>

                        {/* Selected Habits Checklist */}
                        <div className="habits-checklist-grid">
                            {selectedHabitsList.map(habit => {
                                const isChecked = !!selectedDayData.completions[habit.id];
                                const allowed = isDayAllowed(selectedDay);

                                return (
                                    <div
                                        key={habit.id}
                                        className={`habit-toggle-card ${isChecked ? 'habit-toggle-card-checked' : ''} ${!allowed ? 'habit-toggle-card-locked' : ''}`}
                                        onClick={() => handleHabitToggle(habit.id)}
                                    >
                                        <div className="habit-card-icon-box">
                                            <span className="material-symbols-outlined">{habit.icon}</span>
                                        </div>
                                        <div className="habit-card-info">
                                            <h4>{habit.name}</h4>
                                            <p>{habit.description}</p>
                                        </div>
                                        <div className="habit-card-checkbox">
                                            <div className="custom-check-box">
                                                {isChecked && <span className="material-symbols-outlined check-mark">check</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                    </div>
                )}

                {/* TAB 2: PROGRESS INSIGHTS */}
                {activeTab === 'progress' && (
                    <div className="tab-pane animate-fade-in">
                        
                        {/* Bento Grid Stats Cards */}
                        <div className="bento-grid-stats">
                            <div className="bento-stat-card border-glow-orange">
                                <div className="stat-icon-wrapper orange-glow">
                                    <span className="material-symbols-outlined text-orange">local_fire_department</span>
                                </div>
                                <span className="stat-value">{useChallengeContext().streak.streak || 0} Days</span>
                                <span className="stat-label">{language === 'hi' ? 'वर्तमान निरंतरता' : 'Current Streak'}</span>
                            </div>
                            <div className="bento-stat-card border-glow-emerald">
                                <div className="stat-icon-wrapper emerald-glow">
                                    <span className="material-symbols-outlined text-emerald">task_alt</span>
                                </div>
                                <span className="stat-value">{stats.totalHabitsDone}</span>
                                <span className="stat-label">{language === 'hi' ? 'कुल पूर्ण आदतें' : 'Total Habits Done'}</span>
                            </div>
                            <div className="bento-stat-card border-glow-purple col-span-2">
                                <div className="stat-icon-wrapper purple-glow">
                                    <span className="material-symbols-outlined text-purple">bar_chart</span>
                                </div>
                                <div className="double-stat-row">
                                    <div>
                                        <span className="stat-value">{stats.adherence}%</span>
                                        <span className="stat-label">{language === 'hi' ? 'आदतों का पालन' : 'Adherence Rate'}</span>
                                    </div>
                                    <div className="divider-vert" />
                                    <div>
                                        <span className="stat-value">{useChallengeContext().streak.bestStreak || 0} Days</span>
                                        <span className="stat-label">{language === 'hi' ? 'सर्वश्रेष्ठ रिकॉर्ड' : 'Longest Streak'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Weekly visual 3D Progress Chart */}
                        <div className="insights-panel-section">
                            <div className="section-title-row">
                                <span className="material-symbols-outlined icon-blue">analytics</span>
                                <h3>{language === 'hi' ? 'साप्ताहिक विश्लेषण (अंतिम ७ दिन)' : 'Weekly Analytics (Last 7 Days)'}</h3>
                            </div>
                            <div className="weekly-3d-chart-container">
                                <div className="chart-y-axis">
                                    <span>5</span>
                                    <span>3</span>
                                    <span>0</span>
                                </div>
                                <div className="chart-bars-canvas">
                                    {weeklyProgressList.map(day => (
                                        <div key={day.dayNum} className="chart-bar-column">
                                            <div className="bar-track">
                                                <div
                                                    className={`bar-fill-3d ${day.isToday ? 'bar-fill-today' : ''}`}
                                                    style={{ height: `${day.percentage}%` }}
                                                >
                                                    <span className="bar-floating-bubble">{day.count}/5</span>
                                                </div>
                                            </div>
                                            <span className={`bar-axis-label ${day.isToday ? 'label-today' : ''}`}>{day.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Habit-by-Habit Detail Adherence Rate list */}
                        <div className="insights-panel-section">
                            <div className="section-title-row">
                                <span className="material-symbols-outlined icon-purple">tune</span>
                                <h3>{language === 'hi' ? 'आदत अनुसार विश्लेषण' : 'Practice Breakdowns'}</h3>
                            </div>
                            <div className="habit-breakdowns-list">
                                {habitStatsBreakdown.map(h => (
                                    <div key={h.id} className="habit-stat-row">
                                        <div className="habit-stat-header">
                                            <div className="habit-label-group">
                                                <span className="material-symbols-outlined">{h.icon}</span>
                                                <h4>{h.name}</h4>
                                            </div>
                                            <span>{h.doneCount} of {totalDays} days ({h.rate}%)</span>
                                        </div>
                                        <div className="progress-bar-track">
                                            <div className="progress-bar-thumb" style={{ width: `${h.rate}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                )}

                {/* TAB 3: PROFILE */}
                {activeTab === 'wisdom' && (
                    <div className="tab-pane animate-fade-in">
                        
                        {/* Seeker Profile details */}
                        <div className="seeker-profile-card">
                            <h3>{language === 'hi' ? 'साधक विवरण' : 'Seeker Profile'}</h3>
                            <div className="profile-details-list">
                                <div className="profile-detail-item">
                                    <span className="detail-label">{language === 'hi' ? 'नाम:' : 'Name:'}</span>
                                    <span className="detail-value">{state.name}</span>
                                </div>
                                <div className="profile-detail-item">
                                    <span className="detail-label">{language === 'hi' ? 'ईमेल:' : 'Email:'}</span>
                                    <span className="detail-value">{state.email}</span>
                                </div>
                                {state.phone && (
                                    <div className="profile-detail-item">
                                        <span className="detail-label">{language === 'hi' ? 'दूरभाष:' : 'Phone:'}</span>
                                        <span className="detail-value">{state.phone}</span>
                                    </div>
                                )}
                            </div>
                            <button className="btn-logout-dashboard" onClick={handleLogout}>
                                {language === 'hi' ? 'लॉग आउट / रीसेट करें' : 'Logout & Reset Platform'}
                            </button>
                        </div>

                        {/* Daily Wisdom Card */}
                        <div className="wisdom-calligraphy-card">
                            <div className="wisdom-lotus-watermark">🪷</div>
                            <span className="quote-symbol">“</span>
                            <p className="wisdom-quote-text">{dailyWisdom}</p>
                            <span className="wisdom-author">~ Sirshree</span>
                            <div className="wisdom-divider" />
                            <p className="wisdom-sub">{language === 'hi' ? 'तेज ज्ञान फाउंडेशन - सुखी जीवन का मार्ग' : 'Tej Gyan Foundation - Source of Happy Thoughts'}</p>
                        </div>

                    </div>
                )}

            </main>

            {/* Premium Sticky Bottom Tab Bar */}
            <nav className="dashboard-navigation-bar">
                <button
                    className={`nav-bar-item ${activeTab === 'today' ? 'nav-bar-item-active' : ''}`}
                    onClick={() => setActiveTab('today')}
                >
                    <span className="material-symbols-outlined">check_circle</span>
                    <span className="nav-label">{language === 'hi' ? 'दैनिक अभ्यास' : 'Today'}</span>
                </button>
                <button
                    className={`nav-bar-item ${activeTab === 'progress' ? 'nav-bar-item-active' : ''}`}
                    onClick={() => setActiveTab('progress')}
                >
                    <span className="material-symbols-outlined">insights</span>
                    <span className="nav-label">{language === 'hi' ? 'प्रगति चार्ट' : 'Progress'}</span>
                </button>
                <button
                    className={`nav-bar-item ${activeTab === 'wisdom' ? 'nav-bar-item-active' : ''}`}
                    onClick={() => setActiveTab('wisdom')}
                >
                    <span className="material-symbols-outlined">person</span>
                    <span className="nav-label">{language === 'hi' ? 'प्रोफ़ाइल' : 'Profile'}</span>
                </button>
            </nav>

            {/* Certificate Modal */}
            <CertificateModal
                isOpen={showCertificate}
                onClose={() => setShowCertificate(false)}
            />

            {/* Premium Toast Notification */}
            {toast.show && (
                <div className={`toast-notification toast-${toast.type} animate-slide-up`}>
                    <span className="material-symbols-outlined toast-icon">
                        {toast.type === 'success' ? 'check_circle' : 'info'}
                    </span>
                    <span className="toast-message">{toast.message}</span>
                </div>
            )}
        </div>
    );
}
