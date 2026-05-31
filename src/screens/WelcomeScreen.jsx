// ===== WelcomeScreen =====
// Onboarding screen - asks for first name, last name, email, and optional phone.

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChallengeContext } from '../context/ChallengeContext';
import { FloatingParticles } from '../components/ui/FloatingParticles';
import { Button } from '../components/ui/Button';
import { getTotalParticipants } from '../services/firestore';
import logoImg from '../logo.png';
import './WelcomeScreen.css';

export function WelcomeScreen() {
    const { register, state } = useChallengeContext();
    const navigate = useNavigate();

    const [isRegistering, setIsRegistering] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [communityCount, setCommunityCount] = useState(0);
    const timeoutRef = useRef(null);

    useEffect(() => {
        let isMounted = true;
        getTotalParticipants().then(count => {
            if (isMounted) {
                setCommunityCount(count + 1420); // Add default baseline for a warmer community feel
            }
        }).catch(err => console.warn('Failed to get participants', err));

        return () => {
            isMounted = false;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        setError('');

        if (!firstName.trim()) {
            setError('Please enter your first name.');
            return;
        }
        if (!lastName.trim()) {
            setError('Please enter your last name.');
            return;
        }
        if (!email.trim()) {
            setError('Please enter your email.');
            return;
        }

        // Basic Email Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setError('Please enter a valid email address.');
            return;
        }

        // Optional Phone Validation
        if (phone.trim()) {
            const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;
            if (!phoneRegex.test(phone.trim())) {
                setError('Please enter a valid phone number (e.g. 9876543210) or leave it blank.');
                return;
            }
        }

        setIsRegistering(true);

        // Calming preparation transition
        timeoutRef.current = setTimeout(async () => {
            try {
                const registeredUser = await register(firstName.trim(), lastName.trim(), email.trim(), phone.trim());
                
                // Navigate based on onboarding progress:
                // 1. If habits already selected -> Dashboard
                // 2. If challenge joined but habits not chosen -> Library
                // 3. Otherwise -> Challenges List
                if (registeredUser?.selectedHabits?.length > 0) {
                    navigate('/dashboard', { replace: true });
                } else if (registeredUser?.activeChallengeId) {
                    navigate('/library', { replace: true });
                } else {
                    navigate('/challenges', { replace: true });
                }
            } catch (err) {
                console.error(err);
                setIsRegistering(false);
                setError(err.message || 'An error occurred during registration. Please check your network and try again.');
            }
        }, 2200);
    }, [firstName, lastName, email, phone, register, navigate]);

    if (isRegistering) {
        return (
            <div className="welcome-bg">
                <FloatingParticles count={25} />
                <div className="welcome-content loading-content">
                    <img className="welcome-logo-img" src={logoImg} alt="Sampurna Swasthya Logo" />
                    <h2 className="loading-title fade-in">Preparing your path to well-being...</h2>
                    <p className="loading-subtitle fade-in delay-1">"Health is not just the absence of disease, it is a state of complete physical, mental, and spiritual harmony."</p>
                </div>
            </div>
        );
    }

    return (
        <div className="welcome-bg">
            <FloatingParticles count={15} />

            <div className="welcome-content">
                {/* Logo & Branding */}
                <div className="welcome-logo fade-in">
                    <img className="welcome-logo-img" src={logoImg} alt="Sampurna Swasthya Logo" />
                    <h1 className="welcome-title">
                        Sampurna Swasthya<br /><span>Holistic Health</span>
                    </h1>
                    <p className="welcome-subtitle">by Tej Gyan Foundation</p>
                </div>

                {/* Uplifting Quote */}
                <div className="welcome-quote fade-in delay-1">
                    <p>"Transform your daily habits, transform your life."</p>
                    <span>— Sirshree</span>
                </div>

                {/* Register Form */}
                <form className="join-form fade-in delay-2" onSubmit={handleSubmit} autoComplete="off">
                    {error && <div className="form-error">{error}</div>}
                    
                    <div className="form-name-row">
                        <div className="form-group">
                            <label htmlFor="first-name">First Name</label>
                            <input
                                id="first-name"
                                type="text"
                                placeholder="First Name"
                                required
                                minLength={2}
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="last-name">Last Name</label>
                            <input
                                id="last-name"
                                type="text"
                                placeholder="Last Name"
                                required
                                minLength={1}
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="user-email">Email Address</label>
                        <input
                            id="user-email"
                            type="email"
                            placeholder="Enter your email address"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="user-phone">Phone Number <span className="label-optional">(Optional)</span></label>
                        <input
                            id="user-phone"
                            type="tel"
                            placeholder="Enter your mobile number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>

                    <Button
                        variant="primary"
                        type="submit"
                        icon={
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        }
                    >
                        Begin Your Journey
                    </Button>
                </form>

                {/* Seekers Count */}
                <div className="community-badge fade-in delay-3">
                    <div className="pulse-dot" />
                    <span>{communityCount > 0 ? communityCount.toLocaleString() : '1,500+'} souls taking the pledge</span>
                </div>
            </div>
        </div>
    );
}
