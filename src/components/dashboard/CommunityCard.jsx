// ===== CommunityCard =====
// Shows real community count from Firestore participant data.

import { useState, useEffect } from 'react';
import { countCompletedToday, getTotalParticipants } from '../../services/firestore';
import { getTodayISO } from '../../utils/dateHelpers';
import { useChallengeContext } from '../../context/ChallengeContext';
import { t } from '../../utils/translations';
import './CommunityCard.css';

export function CommunityCard() {
    const { language } = useChallengeContext();
    const [todayCount, setTodayCount] = useState(0);
    const [totalParticipants, setTotalParticipants] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function fetchCounts() {
            try {
                const [daily, total] = await Promise.all([
                    countCompletedToday(getTodayISO()),
                    getTotalParticipants(),
                ]);
                if (!cancelled) {
                    setTodayCount(daily);
                    setTotalParticipants(total);
                }
            } catch {
                // Silently fail — shows 0
            }
        }

        fetchCounts();
        return () => { cancelled = true; };
    }, []);

    return (
        <section className="community-section">
            <div className="community-card">
                <div className="community-card__glow" />
                <span className="community-card__leaf">🌍</span>
                <p className="community-card__number">{todayCount.toLocaleString()}</p>
                <p className="community-card__label">{t(language, 'peopleCompleted')}</p>
                <p className="community-card__message">
                    {t(language, 'partOfCollective')}
                </p>
                {totalParticipants > 0 && (
                    <p className="community-card__total">
                        {t(language, 'seekersJoined', { total: totalParticipants.toLocaleString() })}
                    </p>
                )}
            </div>
        </section>
    );
}
