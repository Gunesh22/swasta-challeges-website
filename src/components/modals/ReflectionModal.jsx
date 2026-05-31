// ===== ReflectionModal =====
// 3-step flow: Confirm → Reflect → Complete.
// Works with any day number (not just today).

import { useState, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useChallengeContext } from '../../context/ChallengeContext';
import { WISDOMS } from '../../constants';
import { t } from '../../utils/translations';
import './ReflectionModal.css';

const STEPS = { CONFIRM: 'confirm', REFLECT: 'reflect', COMPLETE: 'complete' };

export function ReflectionModal({ isOpen, onClose, dayNum, onComplete }) {
    const { completeDay, language } = useChallengeContext();
    const [step, setStep] = useState(STEPS.CONFIRM);
    const [thought, setThought] = useState('');

    const handleConfirmYes = useCallback(() => {
        completeDay(dayNum, '', '');
        setStep(STEPS.COMPLETE);
    }, [dayNum, completeDay]);

    const handleSubmit = useCallback(() => {
        // Basic XSS mitigation: strip < and > tags from the thought string
        const sanitizedThought = thought ? thought.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
        completeDay(dayNum, '', sanitizedThought);
        setStep(STEPS.COMPLETE);
    }, [dayNum, thought, completeDay]);

    const handleDone = useCallback(() => {
        setStep(STEPS.CONFIRM);
        setThought('');
        onClose();
        if (onComplete) onComplete();
    }, [onClose, onComplete]);

    const handleClose = useCallback(() => {
        setStep(STEPS.CONFIRM);
        setThought('');
        onClose();
    }, [onClose]);

    const wisdom = WISDOMS[Math.min((dayNum || 1) - 1, WISDOMS.length - 1)];

    return (
        <Modal isOpen={isOpen} onClose={handleClose} className="reflection-modal">
            <button className="modal-close" onClick={handleClose}>&times;</button>

            {/* Step 1: Confirm */}
            {step === STEPS.CONFIRM && (
                <div className="modal-step">
                    <div className="modal-icon">✨</div>
                    <h3>{t(language, 'reflectConfirmTitle', { day: dayNum })}</h3>
                    <p>{t(language, 'reflectConfirmSub')}</p>
                    <div className="confirm-buttons">
                        <Button variant="confirm" onClick={handleConfirmYes}>
                            {t(language, 'reflectConfirmYes')}
                        </Button>
                        <Button variant="danger" onClick={handleClose}>
                            {t(language, 'reflectConfirmNotYet')}
                        </Button>
                    </div>
                </div>
            )}



            {/* Step 3: Complete */}
            {step === STEPS.COMPLETE && (
                <div className="modal-step">
                    <div className="completion-animation">
                        <svg className="checkmark-svg" viewBox="0 0 52 52">
                            <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
                            <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                        </svg>
                    </div>
                    <div className="modal-icon">✨</div>
                    <h3>{t(language, 'reflectCompletedTitle')}</h3>
                    <p className="completion-day">{t(language, 'reflectDayCompleted', { day: dayNum })}</p>
                    <p className="completion-wisdom">{wisdom}</p>
                    <Button variant="primary" onClick={handleDone}>
                        {t(language, 'reflectContinueBtn')}
                    </Button>
                </div>
            )}
        </Modal>
    );
}
