import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { AboutContent, ContactContent, BankDetails } from '@/types'

export const defaultAboutContent: AboutContent = {
  heroTitle: 'Master English the Scientific Way: Test, Try & Talk',
  heroSubtitle:
    'Language Labs is an interactive English learning academy where theory meets active speech. In our intimate 6-desk labs, you do not just study English — you experiment, make mistakes safely, and build real-world speaking confidence.',
  missionTitle: 'Our Mission',
  missionDescription:
    'To eliminate the fear of speaking English through small-group active experimentation. We replace passive lectures with intensive, microphone-in-hand conversational experiments led by an expert mentor.',
  storyTitle: 'Why We Started Language Labs',
  storyDescription:
    'Traditional English classes fail students because one teacher lectures to dozens of silent students. We asked: what if learning English worked like a science laboratory? A small group of 6, hands-on experiments, immediate feedback, and rapid iterations. That hypothesis became Language Labs.',
  principle1Title: 'Strict 6-Seat Batches',
  principle1Desc:
    'Only 6 students per session ensures you never hide in the back row and get maximum personalized speaking time.',
  principle2Title: 'Safe Space to Fail',
  principle2Desc:
    'A supportive environment where errors are treated as valuable learning data, not sources of embarrassment.',
  principle3Title: 'Real-Time Mentor Guidance',
  principle3Desc:
    'Instant pronunciation, grammar, and vocabulary guidance from your dedicated lab mentor every session.',
  principle4Title: 'Measurable Milestones',
  principle4Desc:
    '16 structured sessions tracked Day 1 through Day 16 with level tests and verifiable certificates of completion.',
}

export const defaultContactContent: ContactContent = {
  heading: 'Get in Touch with Our Lab Team',
  subheading:
    'Have questions about our 6-seat batches, level tests, or enrollment process? Reach out directly via WhatsApp or send us an inquiry.',
  email: 'contact@languagelabs.lk',
  phone: '+94 77 212 8573',
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '94772128573',
  address: 'Colombo, Sri Lanka (Online & Interactive Sessions)',
  operatingHours: 'Monday – Saturday: 8:30 AM – 7:30 PM (IST)',
}

export const defaultBankDetails: BankDetails = {
  accountName: 'Language Labs (Pvt) Ltd',
  accountNumber: '0012-3456-7890',
  bankName: 'Commercial Bank of Ceylon',
  branch: 'Colombo Main Branch',
  instructions:
    'Please include your Full Name and registered Email address as the transaction reference, then send the payment slip via WhatsApp to confirm your seat.',
}

export async function getAboutContent(): Promise<AboutContent> {
  try {
    const snap = await getDoc(doc(db, 'admins', 'about'))
    if (snap.exists()) {
      return { ...defaultAboutContent, ...(snap.data() as Partial<AboutContent>) }
    }
  } catch (err) {
    console.error('Error fetching about content:', err)
  }
  return defaultAboutContent
}

export async function getContactContent(): Promise<ContactContent> {
  try {
    const snap = await getDoc(doc(db, 'admins', 'contact'))
    if (snap.exists()) {
      return { ...defaultContactContent, ...(snap.data() as Partial<ContactContent>) }
    }
  } catch (err) {
    console.error('Error fetching contact content:', err)
  }
  return defaultContactContent
}

export async function getBankDetails(): Promise<BankDetails> {
  try {
    const snap = await getDoc(doc(db, 'admins', 'bank'))
    if (snap.exists()) {
      return { ...defaultBankDetails, ...(snap.data() as Partial<BankDetails>) }
    }
  } catch (err) {
    console.error('Error fetching bank details:', err)
  }
  return defaultBankDetails
}

export async function saveAboutContent(data: AboutContent): Promise<void> {
  await setDoc(doc(db, 'admins', 'about'), data, { merge: true })
}

export async function saveContactContent(data: ContactContent): Promise<void> {
  await setDoc(doc(db, 'admins', 'contact'), data, { merge: true })
}

export async function saveBankDetails(data: BankDetails): Promise<void> {
  await setDoc(doc(db, 'admins', 'bank'), data, { merge: true })
}
