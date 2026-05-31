// ===== AlreadyDoneModal =====
// Shown when user tries to mark as completed after already completing today.

import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useChallengeContext } from '../../context/ChallengeContext';
import { t } from '../../utils/translations';

export function AlreadyDoneModal({ isOpen, onClose }) {
    const { language } = useChallengeContext();
    return (
        <Modal isOpen={isOpen} onClose={onClose} className="small-modal">
            <div className="modal-step">
                <div className="modal-icon">✨</div>
                <h3>{t(language, 'alreadyDoneTitle')}</h3>
                <p>{t(language, 'alreadyDoneSub')}</p>
                <Button variant="primary" onClick={onClose}>
                    {t(language, 'alreadyDoneOkayBtn')}
                </Button>
            </div>
        </Modal>
    );
}
