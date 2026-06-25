import { useRef, useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChallengeContext } from '../../context/ChallengeContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { t } from '../../utils/translations';
import './CertificateModal.css';

function formatName(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('  '); // Join with two spaces
}

export function CertificateModal({ isOpen, onClose }) {
    const {
        state,
        language,
        activeChallengeDef,
        availableChallenges,
        joinSpecificChallenge,
        selectChallenge,
        certificatePdfBytes,
        certificateFontBytes
    } = useChallengeContext();

    const navigate = useNavigate();
    const canvasRef = useRef(null);
    const pdfBytesRef = useRef(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSharing, setIsSharing] = useState(false);
    const [error, setError] = useState(null);

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

    // Render Preview
    useEffect(() => {
        if (!isOpen) return;

        let active = true;
        setIsLoading(true);
        setError(null);

        async function init() {
            try {
                if (!window.pdfjsLib || !window.PDFLib) {
                    throw new Error("Required libraries (pdf.js or pdf-lib) are not loaded.");
                }

                // Set pdf.js worker src
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

                // Use preloaded PDF template bytes if available, otherwise fetch
                let bytes;
                if (certificatePdfBytes && certificatePdfBytes.current) {
                    bytes = certificatePdfBytes.current;
                } else {
                    const res = await fetch('/certificate-template.pdf');
                    if (!res.ok) throw new Error("Could not load certificate template");
                    bytes = await res.arrayBuffer();
                }
                
                if (!active) return;
                pdfBytesRef.current = bytes;

                // Render PDF page to canvas
                const pdf = await window.pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
                const page = await pdf.getPage(1);
                
                if (!active) return;

                const scale = 2.0; // Higher scale for high-res rendering
                const viewport = page.getViewport({ scale });
                const pdfPageWidth = viewport.width / scale;
                const pdfPageHeight = viewport.height / scale;

                // Create offscreen canvas to cache PDF background
                const offscreen = document.createElement('canvas');
                offscreen.width = viewport.width;
                offscreen.height = viewport.height;
                const offCtx = offscreen.getContext('2d');

                await page.render({ canvasContext: offCtx, viewport }).promise;
                if (!active) return;

                // Ensure Google font Alex Brush is loaded
                await document.fonts.load('44px "Alex Brush"');
                if (!active) return;

                // Render overlay text on target canvas
                const canvas = canvasRef.current;
                if (!canvas) return;

                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(offscreen, 0, 0);

                // Draw text
                const name = formatName(
                    state.firstName && state.lastName
                        ? `${state.firstName}  ${state.lastName}`
                        : state.name || t(language, 'certDefaultName')
                );
                const fontSize = 44;
                const targetPdfX = 298;
                const targetPdfY = 404;

                const scaleFactor = canvas.width / pdfPageWidth;
                const canvasFontSize = fontSize * scaleFactor;

                ctx.save();
                ctx.font = `normal ${canvasFontSize}px 'Alex Brush'`;
                ctx.fillStyle = 'rgba(26, 26, 26, 0.9)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'alphabetic';

                // Draw baseline of text precisely at canvasY
                const canvasX = targetPdfX * scaleFactor;
                const canvasY = (pdfPageHeight - targetPdfY) * scaleFactor;

                ctx.fillText(name, canvasX, canvasY);
                ctx.restore();

                setIsLoading(false);
            } catch (err) {
                console.error("Error loading certificate preview:", err);
                if (active) {
                    setError(err.message);
                    setIsLoading(false);
                }
            }
        }

        // Wait for the Google Font to load/ready before rendering
        document.fonts.ready.then(() => {
            init();
        });

        return () => {
            active = false;
        };
    }, [isOpen, state.name, state.firstName, state.lastName, language]);

    const handleShare = async () => {
        if (isSharing || !pdfBytesRef.current) return;
        setIsSharing(true);

        const name = formatName(
            state.firstName && state.lastName
                ? `${state.firstName}  ${state.lastName}`
                : state.name || t(language, 'certDefaultName')
        );
        const challengeName = activeChallengeDef?.title || t(language, 'certTitle');
        const shareText = language === 'hi'
            ? `🪷 मैंने तेज ज्ञान फाउंडेशन की "${challengeName}" सफलतापूर्वक पूरी कर ली है!`
            : `🪷 I completed the Tej Gyan Foundation "${challengeName}"!`;

        try {
            const pdfDoc = await window.PDFLib.PDFDocument.load(pdfBytesRef.current.slice(0));
            pdfDoc.registerFontkit(window.fontkit);
            const page = pdfDoc.getPages()[0];

            // Use preloaded font bytes if available, otherwise fetch
            let fontBytesArr;
            if (certificateFontBytes && certificateFontBytes.current) {
                fontBytesArr = certificateFontBytes.current;
            } else {
                const fontUrl = 'https://fonts.gstatic.com/s/alexbrush/v22/SZc83FzrJKuqFbwMKk6EtUL57DtOmCc.ttf';
                const fontBytesRes = await fetch(fontUrl);
                if (!fontBytesRes.ok) throw new Error("Could not download certificate font");
                fontBytesArr = await fontBytesRes.arrayBuffer();
            }
            const font = await pdfDoc.embedFont(fontBytesArr);

            const fontSize = 44;
            const targetPdfX = 298;
            const targetPdfY = 404;

            // Center text at X position
            const textWidth = font.widthOfTextAtSize(name, fontSize);
            const pdfX = targetPdfX - textWidth / 2;
            const pdfY = targetPdfY + (fontSize * 0.15); // Adjust baseline alignment

            page.drawText(name, {
                x: pdfX,
                y: pdfY,
                size: fontSize,
                font: font,
                color: window.PDFLib.rgb(0.1, 0.1, 0.1),
            });

            const modifiedPdf = await pdfDoc.save();
            const blob = new Blob([modifiedPdf], { type: 'application/pdf' });
            const file = new File([blob], `Certificate_${name.replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'TGF Swastha Certificate',
                    text: shareText,
                    files: [file],
                });
            } else {
                // Fallback: Download file directly
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Certificate_${name.replace(/\s+/g, '_')}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                try {
                    await navigator.clipboard.writeText(shareText);
                    alert(t(language, 'certDownloaded'));
                } catch {
                    alert(t(language, 'certDownloadedNoText'));
                }
            }
        } catch (err) {
            console.error("Failed to generate/share certificate:", err);
            alert(t(language, 'certError'));
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="certificate-modal">
            <div className="certificate-wrapper-canvas">
                {isLoading && (
                    <div className="cert-canvas-loader">
                        <span className="button-spinner" />
                        <p>{language === 'hi' ? 'प्रमाणपत्र तैयार किया जा रहा है...' : 'Preparing certificate preview...'}</p>
                    </div>
                )}
                {error && (
                    <div className="cert-canvas-error">
                        <p>Error: {error}</p>
                    </div>
                )}
                <div className="preview-wrap" style={{ display: isLoading || error ? 'none' : 'block' }}>
                    <canvas ref={canvasRef} id="pdfCanvas" style={{ display: 'block', width: '100%', height: 'auto', borderRadius: '8px' }} />
                </div>
            </div>

            <div className="cert-actions">
                <Button variant="primary" onClick={handleShare} disabled={isLoading || isSharing}>
                    {isSharing ? t(language, 'certGeneratingBtn') : (language === 'hi' ? 'प्रमाणपत्र प्राप्त करें' : 'Claim Completion Certificate')}
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
