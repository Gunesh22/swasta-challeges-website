import { useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChallengeContext } from '../../context/ChallengeContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatDate } from '../../utils/dateHelpers';
import { toBlob } from 'html-to-image';
import { t } from '../../utils/translations';
import './CertificateModal.css';

export function CertificateModal({ isOpen, onClose }) {
    const {
        state,
        language,
        activeChallengeDef,
        availableChallenges,
        totalDays,
        joinSpecificChallenge,
        selectChallenge
    } = useChallengeContext();

    const navigate = useNavigate();
    const certRef = useRef(null);
    const [isSharing, setIsSharing] = useState(false);

    const nextChallenges = useMemo(() => {
        return availableChallenges.filter(c => c.id !== activeChallengeDef?.id);
    }, [activeChallengeDef, availableChallenges]);

    const handleNextChallenge = (challengeId) => {
        const isJoined = !!state.challenges?.[challengeId];
        if (isJoined) {
            selectChallenge(challengeId);
        } else {
            joinSpecificChallenge(challengeId);
        }
        onClose();
        navigate('/dashboard');
    };

    const handleShare = async () => {
        if (!certRef.current || isSharing) return;

        setIsSharing(true);
        const challengeName = activeChallengeDef?.title || t(language, 'certTitle');
        const text = language === 'hi'
            ? `🪷 मैंने तेज ज्ञान फाउंडेशन की "${challengeName}" सफलतापूर्वक पूरा कर ली है!`
            : `🪷 I completed the Tej Gyan Foundation "${challengeName}"!`;

        try {
            const blob = await toBlob(certRef.current, {
                cacheBust: true,
                backgroundColor: '#060e0a',
                style: { margin: '0' },
            });

            if (!blob) throw new Error("Could not generate image");

            const file = new File([blob], 'tgf-challenge-certificate.png', { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'TGF Challenge Certificate',
                    text: text,
                    files: [file],
                });
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'tgf-challenge-certificate.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                try {
                    await navigator.clipboard.writeText(text);
                    alert(t(language, 'certDownloaded'));
                } catch {
                    alert(t(language, 'certDownloadedNoText'));
                }
            }
        } catch (error) {
            console.error('Failed to share certificate:', error);
            alert(t(language, 'certError'));
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="certificate-modal">
            <div className="certificate-wrapper" ref={certRef}>
                <div className="cert-border">
                    <div className="cert-content">
                        <div className="cert-lotus">🪷</div>
                        <p className="cert-pre">{t(language, 'certCompletion')}</p>
                        <h2 className="cert-title">{activeChallengeDef?.title || t(language, 'certTitle')}</h2>
                        <div className="cert-divider" />
                        <p className="cert-awarded">{t(language, 'certAwardedTo')}</p>
                        <h3 className="cert-name">{state.name || t(language, 'certDefaultName')}</h3>
                        <p className="cert-body">
                            {language === 'hi'
                                ? `तेज ज्ञान फाउंडेशन चुनौती के भाग के रूप में ${totalDays} दिनों की अपनी यात्रा सफलतापूर्वक पूरा करने के लिए।`
                                : `For successfully completing ${totalDays} days of dedicated practice as part of the Tej Gyan Foundation ${activeChallengeDef?.title || 'Challenge'}.`
                            }
                        </p>
                        <div className="cert-divider" />
                        <p className="cert-date">{formatDate(new Date())}</p>
                        <p className="cert-org">{t(language, 'certOrg')}</p>
                    </div>
                </div>
            </div>

            <div className="cert-actions">
                <Button variant="primary" onClick={handleShare}>
                    {isSharing ? t(language, 'certGeneratingBtn') : t(language, 'certShareBtn')}
                </Button>
            </div>

            <div className="next-challenges-section">
                <h4>{t(language, 'nextJourneyTitle')}</h4>
                <div className="next-challenges-list">
                    {nextChallenges.map(challenge => (
                        <button
                            key={challenge.id}
                            className="next-challenge-item"
                            onClick={() => handleNextChallenge(challenge.id)}
                        >
                            <span className="next-item-icon">{challenge.icon}</span>
                            <div className="next-item-info">
                                <h6>{challenge.title}</h6>
                                <span>{challenge.totalDays} {t(language, 'days')}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="cert-footer-close">
                <Button variant="secondary" onClick={onClose} className="full-width">
                    {t(language, 'certCloseBtn')}
                </Button>
            </div>
        </Modal>
    );
}
