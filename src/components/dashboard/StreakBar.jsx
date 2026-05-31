// ===== StreakBar =====
// Displays total completed days, current streak, and best streak.

import { useChallengeContext } from '../../context/ChallengeContext';
import { t } from '../../utils/translations';
import './StreakBar.css';

export function StreakBar() {
    const { streak, completedCount, language } = useChallengeContext();

    // Ensure the label for current streak doesn't have the colon attached.
    let currentStreakLabel = t(language, 'currentStreak');
    if (currentStreakLabel.endsWith(':')) {
        currentStreakLabel = currentStreakLabel.slice(0, -1);
    }

    return (
        <div className="stats-bar-wrapper">
            <div className={`stats-bar ${streak.streakBroken ? 'streak-bar--lost' : ''}`}>
                <div className="stats-col">
                    <span className="stats-label">{t(language, 'totalDaysLabel').toUpperCase()}</span>
                    <span className="stats-value">
                        <span className="stats-icon">✨</span> {completedCount}
                    </span>
                </div>

                <div className="stats-divider" />

                <div className="stats-col">
                    <span className="stats-label">{currentStreakLabel.toUpperCase()}</span>
                    <span className="stats-value">
                        <span className="stats-icon">🔥</span> {streak.streak}
                    </span>
                </div>

                <div className="stats-divider" />

                <div className="stats-col">
                    <span className="stats-label">{t(language, 'bestStreak').toUpperCase()}</span>
                    <span className="stats-value">
                        <span className="stats-icon">🏆</span> {streak.bestStreak}
                    </span>
                </div>
            </div>

            {streak.streakBroken && (
                <p className="streak-message">
                    {t(language, 'streakBroken')}
                </p>
            )}
        </div>
    );
}
