import { Timestamp } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Shared enums / unions
// ---------------------------------------------------------------------------

export type UserRole = 'student' | 'admin';

/** 'pending' until OTP verified; 'active' after; 'enrolled' once payment is confirmed */
export type AccountStatus = 'pending' | 'active' | 'enrolled';

export type EnglishLevel =
  | 'Beginner'
  | 'Elementary'
  | 'Intermediate'
  | 'Upper-Intermediate'
  | 'Advanced';

/** Blue = available, Grey = booked (payment pending), Red = confirmed (paid) */
export type SeatStatus = 'available' | 'pending' | 'confirmed';

export type PaymentStatus = 'pending' | 'confirmed' | 'rejected';

export type LabStatus = 'notStarted' | 'ongoing' | 'completed';

export type LevelTestSection = 'reading' | 'vocabulary' | 'listening' | 'speaking';

export type InClassTestSection = 'reading' | 'vocabulary';

export type ResourceType = 'pdf' | 'youtube' | 'text';

// ---------------------------------------------------------------------------
// users — student accounts (single admin account also lives here)
// ---------------------------------------------------------------------------

export interface User {
  uid: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: AccountStatus;
  emailVerified: boolean;
  level?: EnglishLevel;
  /** Set once the student books a seat in a lab */
  enrolledLabId?: string;
  /** Dashboard unlocks only after admin confirms payment */
  dashboardUnlocked: boolean;
  /** Used to hard-delete non-enrolled students 7 days after their test */
  testTakenAt?: Timestamp;
  /** True once the completion certificate email has been sent */
  certificateEmailSent?: boolean;
  createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// admins — public mentor profile shown on the homepage (doc id: 'profile')
// ---------------------------------------------------------------------------

/** Bank transfer details shown on the payment page (doc: admins/bank) */
export interface BankDetails {
  accountName: string;
  accountNumber: string;
  bankName: string;
  branch: string;
  instructions?: string;
}

/** About Us page content managed by admin (doc: admins/about) */
export interface AboutContent {
  heroTitle: string;
  heroSubtitle: string;
  missionTitle: string;
  missionDescription: string;
  storyTitle: string;
  storyDescription: string;
  principle1Title?: string;
  principle1Desc?: string;
  principle2Title?: string;
  principle2Desc?: string;
  principle3Title?: string;
  principle3Desc?: string;
  principle4Title?: string;
  principle4Desc?: string;
}

/** Contact Us page content managed by admin (doc: admins/contact) */
export interface ContactContent {
  heading: string;
  subheading: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  address: string;
  operatingHours: string;
}


export interface MentorProfile {
  firstName: string;
  lastName: string;
  /** Firebase Storage download URL of the profile photo */
  photoUrl?: string;
  introduction: string;
  qualifications: string[];
  teachingStyle: string;
  whyCreated: string;
}

// ---------------------------------------------------------------------------
// labs — lab batches, exactly 6 seats each
// ---------------------------------------------------------------------------

export interface Seat {
  /** 1–6 */
  seatNumber: number;
  status: SeatStatus;
  /** Student occupying the seat, if any */
  studentId?: string;
  bookingId?: string;
}

export interface Lab {
  id: string;
  name: string;
  description?: string;
  startDate: Timestamp;
  /** e.g. "Tuesdays and Thursdays, 6:00 PM — 7:30 PM" */
  schedule: string;
  /** Display text, e.g. "8 Weeks — Twice a Week — 16 Sessions" */
  duration?: string;
  /** Total sessions in the lab (Day 1–16) */
  totalSessions: number;
  /** Current unlocked week, set by admin (controls resource unlocking) */
  currentWeek: number;
  /** Highest week the admin has marked complete (0–8) */
  weekCompleted?: number;
  /** Course modules the admin has marked complete (names from COURSE_MODULES) */
  modulesCompleted?: string[];
  seats: Seat[];
  status: LabStatus;
  /** Lab fee shown on the payment page */
  fee?: number;
  createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// bookings — seat bookings + payment status
// ---------------------------------------------------------------------------

export interface Booking {
  id: string;
  labId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  /** 1–6 */
  seatNumber: number;
  /** Admin confirms bank transfer manually (Yes/No toggle) */
  paymentStatus: PaymentStatus;
  paymentConfirmedAt?: Timestamp;
  createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// waitingList — max 12 students, admin-only visibility
// ---------------------------------------------------------------------------

export interface WaitingListEntry {
  id: string;
  /** Set when the visitor was a logged-in student; public visitors have none */
  studentId?: string;
  fullName: string;
  email: string;
  phone: string;
  /** Set true once the "new lab created" email has been sent */
  notified: boolean;
  joinedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// testQuestions — level test content (4 sections)
// ---------------------------------------------------------------------------

/** A single multiple-choice question with 4 options */
export interface MCQuestion {
  id: string;
  question: string;
  options: string[]; // always 4
  correctIndex: number; // 0–3
}

/** Reading: paragraph + 2–3 questions */
export interface ReadingQuestion {
  id: string;
  paragraph: string;
  questions: MCQuestion[];
}

/** Vocabulary: sentence with a blank + 4 word options */
export interface VocabularyQuestion {
  id: string;
  /** Complete sentence containing ___ where the blank is */
  sentence: string;
  /** The correct word */
  correctAnswer: string;
  /** 4 words; as stored by the admin the first one is correct — shuffle before display */
  options: string[];
}

/** Listening: image + audio clip + 4 options */
export interface ListeningQuestion {
  id: string;
  imageUrl: string;
  audioUrl: string;
  question: string;
  options: string[]; // always 4
  correctIndex: number; // 0–3
}

/** Speaking: 1 question, answered via browser recording */
export interface SpeakingQuestion {
  id: string;
  question: string;
}

/** One collected answer during a test — no correctness info attached */
export interface TestAnswer {
  questionId: string;
  /**
   * What the student picked: an option index (0–3) for reading/listening,
   * or the chosen word for vocabulary (options are shuffled on display,
   * so an index would be meaningless there).
   */
  selectedAnswer: number | string;
}

/** Full level test content document */
export interface TestQuestions {
  id: string;
  reading: ReadingQuestion[];
  vocabulary: VocabularyQuestion[];
  listening: ListeningQuestion[];
  speaking: SpeakingQuestion;
  updatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// testResults — student test scores + speaking file url
// ---------------------------------------------------------------------------

export interface TestResult {
  id: string;
  studentId: string;
  /** Section scores as percentages (0–100) */
  readingScore: number;
  vocabularyScore: number;
  listeningScore: number;
  /** Marked manually by admin after listening to the recording */
  speakingScore: number | null;
  /** Recording URL — deleted from Storage after admin marks and emails; null when mic was skipped */
  speakingFileUrl: string | null;
  reviewedByAdmin: boolean;
  reviewedAt?: Timestamp;
  /** Assigned once the admin reviews the speaking recording */
  level?: EnglishLevel;
  createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// resources — free or week-locked learning materials
// ---------------------------------------------------------------------------

export interface Resource {
  id: string;
  title: string;
  description?: string;
  type: ResourceType;
  /** Firebase Storage download URL — for type 'pdf' */
  fileUrl?: string;
  /** YouTube video URL — for type 'youtube' */
  youtubeUrl?: string;
  /** Optional custom thumbnail — falls back to the YouTube-derived one */
  thumbnailUrl?: string;
  /** Optional mini thumbnail image path, e.g. /images/mini-images/mini-c-1.png */
  thumbnailImage?: string;
  /** Inline post content — for type 'text' */
  content?: string;
  /** Free resources show on the public site; others unlock by week */
  isFree: boolean;
  /** Required when not free — week number that unlocks it */
  unlockWeek?: number;
  /** Required when not free — which lab this belongs to */
  labId?: string;
  createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// inClassTests — admin-created quizzes (Reading + Vocabulary only)
// ---------------------------------------------------------------------------

export interface InClassTest {
  id: string;
  labId: string;
  title: string;
  reading: ReadingQuestion[];
  vocabulary: VocabularyQuestion[];
  /** Students may attend only within [startTime, startTime + durationMinutes] */
  startTime: Timestamp;
  durationMinutes: number;
  /** Stored as 'scheduled'; Active/Completed are derived from startTime + duration */
  status: 'scheduled';
  createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// inClassResults — in-class quiz scores (marks only, no answer data)
// ---------------------------------------------------------------------------

export interface InClassResult {
  id: string;
  testId: string;
  labId: string;
  studentId: string;
  /** Set when the student opens the test (drives the In Progress status) */
  startedAt?: Timestamp;
  /** Correct answers per section (counts, not percentages) */
  readingScore?: number;
  vocabularyScore?: number;
  /** Total correct answers */
  score?: number;
  totalQuestions?: number;
  /** Percentage 0–100 */
  totalScore?: number;
  submittedAt?: Timestamp;
}

// ---------------------------------------------------------------------------
// attendance — session attendance per student
// ---------------------------------------------------------------------------

export interface AttendanceRecord {
  id: string;
  labId: string;
  studentId: string;
  /** Session number, Day 1–16 */
  sessionNumber: number;
  /** Week 1–8 (two sessions per week) */
  weekNumber: number;
  present: boolean;
  date: Timestamp;
}

// ---------------------------------------------------------------------------
// otpCodes — email OTP verification codes
// ---------------------------------------------------------------------------

export interface OtpCode {
  /** Document id is the email address */
  id: string;
  email: string;
  code: string;
  expiresAt: Timestamp;
  used: boolean;
  createdAt: Timestamp;
}
