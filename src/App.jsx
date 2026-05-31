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

        const allHabits = activeChallengeDef?.habits || adminSettings?.habits || [];
        const targetHabitCount = Math.min(5, allHabits.length);
        const hasValidHabits = state.selectedHabits && 
            state.selectedHabits.length === targetHabitCount && 
            state.selectedHabits.every(id => allHabits.some(h => h.id === id));

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

        const allHabits = activeChallengeDef?.habits || adminSettings?.habits || [];
        const targetHabitCount = Math.min(5, allHabits.length);
        const hasValidHabits = state.selectedHabits && 
            state.selectedHabits.length === targetHabitCount && 
            state.selectedHabits.every(id => allHabits.some(h => h.id === id));

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
