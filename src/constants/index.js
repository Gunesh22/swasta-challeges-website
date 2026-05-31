// ===== Challenge Constants =====

// Define the challenges (Admin Panel mockup)
export const AVAILABLE_CHALLENGES = [
    {
        id: '11_day_intro',
        title: '11-Day Challenge',
        totalDays: 11,
        icon: '🪷',
        description: 'Begin your journey with 11 days of dedicated practice and self-reflection.',
        availableFrom: '2026-03-01'
    },
    {
        id: '21_day_deep',
        title: '21-Day Advance Challenge',
        totalDays: 21,
        icon: '🌌',
        description: 'Dive deeper into your practice and expand your skills with this advanced journey.',
        availableFrom: '2026-03-05'
    },
    {
        id: '7_day_sleep',
        title: '7-Day Habit Formation',
        totalDays: 7,
        icon: '🌙',
        description: 'Short journey designed to help you form a positive daily habit.',
        availableFrom: '2026-03-15' // Upcoming
    }
];

export const TOTAL_DAYS = 11; // Retaining temporarily for backward compatibility if missed during migration
export const STORAGE_KEY = 'tgf_challenge_platform';

export const WISDOMS = [
    "Consistency is the key to lasting change.",
    "Every small step leads to a bigger destination.",
    "You are building a foundation of excellence.",
    "Each day is a fresh beginning for growth.",
    "Transformation happens one day at a time.",
    "Dedication is where results are found.",
    "You're investing in your most important asset — yourself.",
    "The more you focus, the more you achieve.",
    "Progress is always within your reach.",
    "You showed up for yourself today. That matters.",
    "The discipline you build today will serve you for a lifetime.",
];

export const SESSION_TIMES = [
    { time: '7:00 AM', label: 'IST', hourStart: 5, hourEnd: 12 },
    { time: '2:30 PM', label: 'IST', hourStart: 12, hourEnd: 18 },
    { time: '8:00 PM', label: 'IST', hourStart: 18, hourEnd: 21 },
    { time: '10:00 PM', label: 'IST', hourStart: 21, hourEnd: 24 },
    { time: '2:30 AM', label: 'IST', hourStart: 0, hourEnd: 5 },
];

export const HOLISTIC_HABITS = [
    { id: 'water', name: 'Drink Water', description: 'Stay hydrated (3L)', icon: 'water_drop', color: 'primary' },
    { id: 'meditate', name: 'Meditate', description: 'Mindfulness practice (15m)', icon: 'self_improvement', color: 'secondary' },
    { id: 'read', name: 'Read Book', description: '10 pages a day', icon: 'menu_book', color: 'tertiary' },
    { id: 'exercise', name: 'Exercise', description: 'Active movement (30m)', icon: 'fitness_center', color: 'primary' },
    { id: 'journal', name: 'Journaling', description: 'Reflect on today', icon: 'edit_note', color: 'secondary' },
    { id: 'sleep', name: 'Sleep 8 Hours', description: 'Proper body recovery', icon: 'bedtime', color: 'tertiary' },
    { id: 'diet', name: 'Healthy Meal', description: 'Fuel your body right', icon: 'restaurant', color: 'primary' }
];

export const INITIAL_STATE = {
    registered: false,
    userId: null,
    name: '',
    email: '',
    phone: '',
    language: 'en',
    selectedHabits: [], // Array of 5 habit IDs selected by the user

    // Multi-Challenge Progress
    activeChallengeId: null, // 'sampurna_swasthya'
    challenges: {}, // { 'sampurna_swasthya': { startDate, completedDays, Reflections, habitCompletions } }
};
