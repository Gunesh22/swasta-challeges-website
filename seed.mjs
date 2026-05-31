// ===== Seed Script: Register 20 fake participants to challenge FilPDAUN8d2VZG46qiWQ =====
import { initializeApp } from 'firebase/app';
import {
    getFirestore, doc, setDoc, serverTimestamp
} from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBUUu6i0tJbJkuZXeYWdUUKKOZY-ajxejE",
    authDomain: "tgf-challenges.firebaseapp.com",
    projectId: "tgf-challenges",
    storageBucket: "tgf-challenges.firebasestorage.app",
    messagingSenderId: "628255693136",
    appId: "1:628255693136:web:e319264781674f85403455",
    measurementId: "G-DY149PH181"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CHALLENGE_ID = 'FilPDAUN8d2VZG46qiWQ';
const CHALLENGE_START = '2026-04-01';

const FAKE_USERS = [
    { name: 'Aarav Sharma', phone: '9876543210' },
    { name: 'Priya Patel', phone: '9876543211' },
    { name: 'Rohan Gupta', phone: '9876543212' },
    { name: 'Ananya Verma', phone: '9876543213' },
    { name: 'Vikram Singh', phone: '9876543214' },
    { name: 'Meera Joshi', phone: '9876543215' },
    { name: 'Arjun Reddy', phone: '9876543216' },
    { name: 'Kavya Iyer', phone: '9876543217' },
    { name: 'Siddharth Rao', phone: '9876543218' },
    { name: 'Nisha Mehta', phone: '9876543219' },
    { name: 'Aditya Kumar', phone: '9876543220' },
    { name: 'Riya Desai', phone: '9876543221' },
    { name: 'Karan Malhotra', phone: '9876543222' },
    { name: 'Divya Nair', phone: '9876543223' },
    { name: 'Harsh Trivedi', phone: '9876543224' },
    { name: 'Sneha Kapoor', phone: '9876543225' },
    { name: 'Raj Thakur', phone: '9876543226' },
    { name: 'Pooja Bansal', phone: '9876543227' },
    { name: 'Amit Choudhary', phone: '9876543228' },
    { name: 'Tanvi Shah', phone: '9876543229' },
];

const COMPLETED_COUNTS = [5, 5, 4, 4, 4, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 1, 0, 0];

function getDateISO(startDate, dayOffset) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + dayOffset);
    return d.toISOString().split('T')[0];
}

async function seed() {
    console.log(`🌱 Registering 20 participants to challenge: ${CHALLENGE_ID}\n`);

    for (let i = 0; i < FAKE_USERS.length; i++) {
        const user = FAKE_USERS[i];
        const daysCompleted = COMPLETED_COUNTS[i];
        const userId = user.phone;

        // Build completedDays + completedDatesArray
        const completedDays = {};
        const completedDatesArray = [];

        for (let d = 0; d < daysCompleted; d++) {
            const dateISO = getDateISO(CHALLENGE_START, d);
            completedDays[dateISO] = true;
            completedDatesArray.push(dateISO);
        }

        // Create user_challenges document for this challenge
        const challengeDocId = `${userId}_${CHALLENGE_ID}`;
        const challengeRef = doc(db, 'user_challenges', challengeDocId);
        await setDoc(challengeRef, {
            userId,
            challengeId: CHALLENGE_ID,
            startDate: CHALLENGE_START,
            completedDays,
            completedDatesArray,
            reflections: {},
            createdAt: serverTimestamp(),
        });
        console.log(`✅ ${user.name} → ${daysCompleted}/11 days`);
    }

    console.log('\n🎉 Done! All 20 registered to ' + CHALLENGE_ID);
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
