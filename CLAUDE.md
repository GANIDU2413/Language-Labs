# Language Labs — Claude Code Project Guide

## What This Project Is
An English learning platform called Language Labs built with 
Next.js 14, Firebase, and Tailwind CSS. It has a science lab 
theme with Deep Blue, Electric Blue, and White colours.

## Tech Stack
- Framework: Next.js 14 (App Router)
- Styling: Tailwind CSS + Framer Motion + Lottie React
- Database: Firebase Firestore
- Auth: Firebase Auth (Email/Password)
- Storage: Firebase Storage
- Emails: Resend
- PDF: jsPDF + html2canvas
- Forms: React Hook Form + Zod
- Hosting: Vercel

## Project Structure
app/                  → All pages (Next.js App Router)
  (public)/           → Public pages (no login needed)
  (student)/          → Student protected pages
  (admin)/            → Admin protected pages
  api/                → API routes (OTP, email, PDF)
components/           → Reusable UI components
  ui/                 → Buttons, cards, inputs
  layout/             → Navbar, footer, sidebar
  forms/              → Form components
  lab/                → Lab/booking specific components
  test/               → Level test components
  admin/              → Admin panel components
lib/
  firebase.ts         → Firebase initialisation
  firestore.ts        → Firestore helper functions
  storage.ts          → Firebase Storage helpers
  resend.ts           → Email sending functions
  pdf.ts              → PDF generation helpers
  utils.ts            → General utility functions
hooks/                → Custom React hooks
types/
  index.ts            → All TypeScript interfaces

## Colour Theme
- Deep Blue: #0A1628
- Electric Blue: #1E90FF
- White: #FFFFFF
- Blue Light: #E6F1FB

## User Roles
1. Public visitor — no login, can view homepage and free resources
2. Student — registered, can take level test, book a lab, access dashboard
3. Admin — single admin account, manages everything

## Firebase Collections
- users → students data
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
1. Student details
2. New Lab creation
3. New Labs (not started)
4. Ongoing Labs (in progress)
5. Attendance
6. Upload resources
7. Tests materials (level test content)
8. Review speaking tests
9. In-class test
10. Waiting list

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
Project is freshly set up. Starting from scratch.
Build order: Foundation → Auth → Landing Page → Level Test 
→ Lab Booking → Admin Panel → Student Dashboard → Polish