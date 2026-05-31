// ===== ReflectionsList =====
// Shows past challenge reflections.

import { useMemo } from 'react';
import { useChallengeContext } from '../../context/ChallengeContext';
import { getDayIndexForDate } from '../../utils/dateHelpers';
import { t } from '../../utils/translations';
import './ReflectionsList.css';

export function ReflectionsList() {
    const { activeData, language } = useChallengeContext();

    const entries = useMemo(() => {
        if (!activeData || !activeData.reflections) return [];
        return Object.entries(activeData.reflections)
            .sort(([a], [b]) => b.localeCompare(a));
    }, [activeData]);

    if (entries.length === 0) return null;



    return (
        <section className="reflections-section">
            <div className="section-header">
                <h3>{t(language, 'yourReflections')}</h3>
            </div>
            <div className="reflections-list">
                {entries.map(([date, data]) => {
                    const dayIdx = getDayIndexForDate(activeData.startDate, date);
                    return (
                        <div key={date} className="reflection-item">
                            <div className="reflection-item__header">
                                <span className="reflection-item__day">{t(language, 'day')} {dayIdx}</span>
                            </div>
                            {data.thought && (
                                <p className="reflection-item__thought">"{data.thought}"</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
