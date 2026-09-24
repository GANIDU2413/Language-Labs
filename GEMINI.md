# Language Labs — Antigravity Project Guide

## What This Project Is
An English learning platform called Language Labs built with 
Next.js 16 (App Router), React 19, Firebase, and Tailwind CSS v4. It has a science lab 
theme with Deep Blue, Electric Blue, and White colours.

## Tech Stack
- Framework: Next.js 16 (App Router)
- UI Library: React 19
- Styling: Tailwind CSS v4 + Framer Motion + Lottie React
- Database: Firebase Firestore
- Auth: Firebase Auth (Email/Password)
- Storage: Firebase Storage
- Emails: Resend
- PDF: jsPDF + html2canvas
- Forms: React Hook Form + Zod
- Routing / Middleware: Next.js proxy convention (`proxy.ts`)
- Hosting: Vercel

## Project Structure
app/                  → All pages (Next.js App Router)
  (public)/           → Public pages (Home, About, Contact, Available Labs, Learning Materials, Waiting List)
  (student)/          → Student protected pages (Dashboard, Profile, Resources, Tests, Certificate)
  (admin)/            → Admin protected pages (Labs, Attendance, Resources, Test Materials, Reviews, Waiting List, Profile)
  (auth)/             → Auth pages (Login, Register, OTP verification)
  api/                → API routes (send-otp, verify-otp, send-email, notify-admin, cleanup-pending-students)
components/           → Reusable UI components
  ui/                 → Buttons, cards, inputs, modal, loading spinner
  layout/             → Navbar, footer, hero, course overview, mentor preview
  forms/              → Form components
  lab/                → Lab/booking specific components (seat grid, booking cards)
  test/               → Level test components (Reading, Vocabulary, Listening, Speaking)
  admin/              → Admin panel components (sidebar, question forms)
lib/
  firebase.ts         → Firebase initialisation (Auth, Firestore, Storage)
  firestore.ts        → Firestore helper functions
  storage.ts          → Firebase Storage helpers
  resend.ts           → Email sending functions
  pdf.ts              → PDF generation helpers
  utils.ts            → General utility functions
hooks/                → Custom React hooks (useAuth, useToast, useCountdown, etc.)
types/
  index.ts            → All TypeScript interfaces
proxy.ts              → Route protection & role-based proxying (formerly middleware)

## Colour Theme
- Deep Blue: #0A1628
- Electric Blue: #1E90FF
- White: #FFFFFF
- Blue Light: #E6F1FB

## User Roles
1. Public visitor — no login, can view homepage and free resources
2. Student — registered, can take level test, book a lab, access dashboard
3. Admin — single admin account (role: 'admin'), manages everything

## Firebase Collections
- users → students data & admin account (`role: 'student' | 'admin'`)
- admins → admin documents (`admins/profile` for mentor bio/photo, `admins/bank` for bank details)
- labs → lab batches (max 6 seats each)
- bookings → seat bookings + payment status
- waitingList → max 12 students when no labs available
- testQuestions → level test content (4 sections)
- testResults → student test scores + speaking file url
- resources → free or week-locked learning materials
- inClassTests → admin-created quizzes for enrolled students
- inClassResults → in-class quiz scores
- attendance → session attendance per student
- otpCodes → email OTP verification codes

## Key Business Rules
- Each lab has exactly 6 seats (desks)
- Seat colours: Blue=available, Red=confirmed/paid, Grey=booked/pending
- Payment is bank transfer only — no payment gateway
- Admin confirms payment manually (Yes/No toggle)
- Student dashboard unlocks only after admin confirms payment
- Speaking recording deleted from storage after admin marks and emails
- Students who tested but did not enroll are hard deleted after 7 days
- Waiting list max 12 students, private to admin only
- Cannot delete a lab that has started or has any enrolled students
- Lab resources unlock by week number as set by admin
- In-class tests: Reading + Vocabulary only, time-bound

## Important Features
- OTP email verification on registration (via Resend)
- Live seat updates using Firestore onSnapshot (realtime)
- WhatsApp button on payment page using wa.me link
- Speaking test uses browser MediaRecorder API
- Listening test uses browser Audio API
- PDF download for test results and completion certificate
- Email auto-sent when admin creates new lab (to waiting list students)
- Admin can monitor in-class tests in real time

## Environment Variables
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
RESEND_API_KEY
ADMIN_EMAIL
NEXT_PUBLIC_WHATSAPP_NUMBER

## Coding Rules — Always Follow These
- Always use TypeScript, never plain JavaScript
- Next.js 16 conventions: breaking changes exist compared to older versions — consult `node_modules/next/dist/docs/` when needed
- Always use Tailwind CSS for styling, no inline styles
- Always use React Hook Form + Zod for any form
- Always use the types defined in types/index.ts
- Always import Firebase from lib/firebase.ts
- Never hardcode any API keys or secrets
- Always handle loading states on buttons and forms
- Always handle error states and show user-friendly messages
- Use 'use client' directive only when needed (forms, hooks, browser APIs)
- Keep pages thin — logic goes in hooks or lib files
- Mobile first — always check mobile layout before desktop

## Admin Panel Nav Items
1. Student details (`/admin/students`)
2. New Lab creation (`/admin/labs/new`)
3. New Labs / not started (`/admin/labs/not-started`)
4. Ongoing Labs / in progress (`/admin/labs/ongoing`)
5. Attendance (`/admin/attendance`)
6. Upload resources (`/admin/resources`)
7. Test materials / level test content (`/admin/test-materials`)
8. Review speaking tests (`/admin/speaking-review`)
9. In-class test (`/admin/inclass-test`)
10. Waiting list (`/admin/waiting-list`)
11. Mentor profile (`/admin/profile`)

## Student Dashboard Nav Items
1. Progress tracker (Day 1-16)
2. Attendance
3. Resources
4. In-class tests
5. Certificate
6. Profile

## Level Test Sections (in order)
1. Reading — paragraph + 2-3 questions + 4 radio options each
2. Vocabulary — sentence with blank + 4 word options each
3. Listening — image + audio clip + 4 radio options each
4. Speaking — 1 question + record button (saved to Firebase Storage)

## In-Class Test Sections
- Reading and Vocabulary only (no Listening, no Speaking)
- Admin sets start time and duration
- Students attend within active window only
- Results shown instantly after submit
- Only marks saved, no answer data kept

## Current Status
- Project core architecture, routes, and security rules are implemented.
- Public pages, Auth flow with OTP verification, Student dashboard, and Admin portal are functional.
- Continue iterating on polish, testing, responsive design, and production readiness.