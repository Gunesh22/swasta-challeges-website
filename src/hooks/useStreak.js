// ===== useStreak Hook =====
// Calculates the current challenge streak based on the configurable challenge sequence.

import { useMemo } from 'react';
import { getDateForDay } from '../utils/dateHelpers';

export function calculateStreak(completedDays, startDate, totalDays, currentDay) {
    if (!startDate) return { streak: 0, streakBroken: false };

    // Build a boolean array: which days (1–11) are completed?
    const dayStatus = [];
    for (let d = 1; d <= totalDays; d++) {
        const dateForDay = getDateForDay(startDate, d);
        dayStatus.push(!!completedDays[dateForDay]);
    }

    // Find the last completed day index
    let lastCompletedIdx = -1;
    for (let i = dayStatus.length - 1; i >= 0; i--) {
        if (dayStatus[i]) {
            lastCompletedIdx = i;
            break;
        }
    }

    // No days completed
    if (lastCompletedIdx === -1) return { streak: 0, streakBroken: false };

    // Count streak backward from the last completed day
    let streak = 0;
    for (let i = lastCompletedIdx; i >= 0; i--) {
        if (dayStatus[i]) {
            streak++;
        } else {
            break;
        }
    }

    // Determine if the active streak is permanently broken due to inactivity gaps
    if (currentDay && lastCompletedIdx !== -1) {
        // The maximum allowed past days to complete is 2, so days before currentDay - 2 are locked
        const nextNeededDayNum = (lastCompletedIdx + 1) + 1;
        if (nextNeededDayNum < currentDay - 2) {
            streak = 0; // Streak is dead, gap can never be bridged
        }
    }

    // Detect if streak was broken — there's a gap before the current streak
    let streakBroken = false;
    const firstDayOfStreak = lastCompletedIdx - streak + 1;
    if (firstDayOfStreak > 0) {
        // There are days before the current streak — check if any were completed
        // (meaning there was an earlier streak that got broken)
        for (let i = 0; i < firstDayOfStreak; i++) {
            if (dayStatus[i]) {
                streakBroken = true;
                break;
            }
        }
    }
    // Calculate best streak
    let bestStreak = 0;
    let tempStreak = 0;
    for (let i = 0; i < dayStatus.length; i++) {
        if (dayStatus[i]) {
            tempStreak++;
            bestStreak = Math.max(bestStreak, tempStreak);
        } else {
            tempStreak = 0;
        }
    }

    return { streak, bestStreak, streakBroken };
}

/**
 * Computes streak info from completed days within the challenge.
 * Counts the longest active streak of consecutive completed days,
 * walking backward from the last completed day.
 *
 * @param {Object} completedDays - { "YYYY-MM-DD": true, ... }
 * @param {string|null} startDate - ISO date string of Day 1
 * @param {number} totalDays - Number of days in challenge
 * @param {number} currentDay - The actual active current challenge day
 * @returns {{ streak: number, streakBroken: boolean }}
 */
export function useStreak(completedDays, startDate, totalDays = 11, currentDay) {
    return useMemo(() => calculateStreak(completedDays, startDate, totalDays, currentDay), [completedDays, startDate, totalDays, currentDay]);
}
