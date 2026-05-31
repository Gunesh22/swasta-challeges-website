// ===== CompleteBanner =====
// Shown when all 11 days are completed. Links to certificate.

import { useChallengeContext } from '../../context/ChallengeContext';
import { t } from '../../utils/translations';
import './CompleteBanner.css';

export function CompleteBanner({ onViewCertificate }) {
    const { isChallengeComplete, isChallengeFailed, language } = useChallengeContext();

    if (isChallengeComplete) {
        return (
            <section className="challenge-complete-banner">
                <div className="complete-card">
                    <span className="complete-card__icon">🏆</span>
                    <h3>{t(language, 'bannerHeading')}</h3>
                    <p>{t(language, 'bannerText')}</p>
                    <button className="btn-view-cert" onClick={onViewCertificate}>
                        <span>✦</span>
                        <span>{t(language, 'viewCertificate')}</span>
                    </button>
                </div>
            </section>
        );
    }

    if (isChallengeFailed) {
        return (
            <section className="challenge-complete-banner failed">
                <div className="complete-card failed-card">
                    <span className="complete-card__icon failed-icon">🍂</span>
                    <h3>{t(language, 'bannerFailedHeading')}</h3>
                    <p>{t(language, 'bannerFailedText')}</p>
                </div>
            </section>
        );
    }

    return null;
}
