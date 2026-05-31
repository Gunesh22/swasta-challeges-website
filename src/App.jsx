// ===== App Root =====
// Routing + context provider setup with self-healing guards.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChallengeProvider, useChallengeContext } from './context/ChallengeContext';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { ChallengeSelectionScreen } from './screens/ChallengeSelectionScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { DashboardScreen } from './screens/DashboardScreen';

/**
 * Route guard — redirects users dynamically based on onboarding stage.
 */
function ProtectedRoute({ children, requireChallenge = false, requireHabits = false }) {
    const { state, isDataLoaded, activeChallengeDef, adminSettings } = useChallengeContext();

    if (!isDataLoaded) {
        // Prevent layout flash/stale redirection loops by returning a smooth blank page while loading
        return null;
    }

    if (!state.registered) {
        return <Navigate to="/" replace />;
    }

    // Require challenge selection phase
    if (requireChallenge && !state.activeChallengeId) {
        return <Navigate to="/challenges" replace />;
    }

    // Require habits selection phase
    if (requireHabits) {
        if (!state.activeChallengeId) {
            return <Navigate to="/challenges" replace />;
        }

        // Use length-check to avoid treating `[]` as truthy (empty array != no habits)
        const challengeHabits = activeChallengeDef?.habits?.length > 0
            ? activeChallengeDef.habits
            : (adminSettings?.habits?.length > 0 ? adminSettings.habits : []);

        let hasValidHabits;
        if (challengeHabits.length === 0) {
            // Challenge has no specific habits — any existing selection is valid
            hasValidHabits = state.selectedHabits && state.selectedHabits.length > 0;
        } else {
            const habitCount = activeChallengeDef?.habitCount;
            const targetHabitCount = habitCount > 0
                ? Math.min(habitCount, challengeHabits.length)
                : Math.min(5, challengeHabits.length);
            hasValidHabits = state.selectedHabits &&
                state.selectedHabits.length === targetHabitCount &&
                state.selectedHabits.every(id => challengeHabits.some(h => h.id === id));
        }

        if (!hasValidHabits) {
            return <Navigate to="/library" replace />;
        }
    }

    return children;
}

function PublicRoute({ children }) {
    const { state, isDataLoaded, activeChallengeDef, adminSettings } = useChallengeContext();

    if (!isDataLoaded) {
        return null;
    }

    if (state.registered) {
        if (!state.activeChallengeId) {
            return <Navigate to="/challenges" replace />;
        }

        // Use length-check to avoid treating `[]` as truthy
        const challengeHabits = activeChallengeDef?.habits?.length > 0
            ? activeChallengeDef.habits
            : (adminSettings?.habits?.length > 0 ? adminSettings.habits : []);

        let hasValidHabits;
        if (challengeHabits.length === 0) {
            hasValidHabits = state.selectedHabits && state.selectedHabits.length > 0;
        } else {
            const habitCount = activeChallengeDef?.habitCount;
            const targetHabitCount = habitCount > 0
                ? Math.min(habitCount, challengeHabits.length)
                : Math.min(5, challengeHabits.length);
            hasValidHabits = state.selectedHabits &&
                state.selectedHabits.length === targetHabitCount &&
                state.selectedHabits.every(id => challengeHabits.some(h => h.id === id));
        }

        if (!hasValidHabits) {
            return <Navigate to="/library" replace />;
        }

        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

function AppRoutes() {
    return (
        <Routes>
            <Route
                path="/"
                element={
                    <PublicRoute>
                        <WelcomeScreen />
                    </PublicRoute>
                }
            />
            <Route
                path="/challenges"
                element={
                    <ProtectedRoute>
                        <ChallengeSelectionScreen />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/library"
                element={
                    <ProtectedRoute requireChallenge={true}>
                        <LibraryScreen />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute requireChallenge={true} requireHabits={true}>
                        <DashboardScreen />
                    </ProtectedRoute>
                }
            />
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <ChallengeProvider>
                <AppRoutes />
            </ChallengeProvider>
        </BrowserRouter>
    );
}
