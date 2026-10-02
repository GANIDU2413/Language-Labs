'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { toast } from '@/hooks/useToast'
import {
  getAboutContent,
  getContactContent,
  getBankDetails,
  saveAboutContent,
  saveContactContent,
  saveBankDetails,
  defaultAboutContent,
  defaultContactContent,
  defaultBankDetails,
} from '@/lib/siteSettings'
import type { AboutContent, ContactContent, BankDetails } from '@/types'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const aboutSchema = z.object({
  heroTitle: z.string().min(3, 'Hero title is required'),
  heroSubtitle: z.string().min(10, 'Hero subtitle is required'),
  missionTitle: z.string().min(2, 'Mission title is required'),
  missionDescription: z.string().min(10, 'Mission description is required'),
  storyTitle: z.string().min(2, 'Story title is required'),
  storyDescription: z.string().min(10, 'Story description is required'),
  principle1Title: z.string().min(2, 'Title required'),
  principle1Desc: z.string().min(5, 'Description required'),
  principle2Title: z.string().min(2, 'Title required'),
  principle2Desc: z.string().min(5, 'Description required'),
  principle3Title: z.string().min(2, 'Title required'),
  principle3Desc: z.string().min(5, 'Description required'),
  principle4Title: z.string().min(2, 'Title required'),
  principle4Desc: z.string().min(5, 'Description required'),
})
type AboutForm = z.infer<typeof aboutSchema>

const contactSchema = z.object({
  heading: z.string().min(3, 'Heading is required'),
  subheading: z.string().min(5, 'Subheading is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(5, 'Phone number is required'),
  whatsappNumber: z.string().min(8, 'WhatsApp number is required (with country code)'),
  address: z.string().min(3, 'Address is required'),
  operatingHours: z.string().min(3, 'Operating hours are required'),
})
type ContactForm = z.infer<typeof contactSchema>

const bankSchema = z.object({
  accountName: z.string().min(2, 'Account name is required'),
  accountNumber: z.string().min(3, 'Account number is required'),
  bankName: z.string().min(2, 'Bank name is required'),
  branch: z.string().min(2, 'Branch is required'),
  instructions: z.string().optional(),
})
type BankForm = z.infer<typeof bankSchema>

type ActiveTab = 'about' | 'contact' | 'bank'

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('about')
  const [loading, setLoading] = useState(true)

  // Forms
  const aboutForm = useForm<AboutForm>({
    resolver: zodResolver(aboutSchema),
    defaultValues: defaultAboutContent,
  })

  const contactForm = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: defaultContactContent,
  })

  const bankForm = useForm<BankForm>({
    resolver: zodResolver(bankSchema),
    defaultValues: defaultBankDetails,
  })

  // Load existing data from Firestore
  useEffect(() => {
    Promise.all([getAboutContent(), getContactContent(), getBankDetails()])
      .then(([aboutData, contactData, bankData]) => {
        aboutForm.reset(aboutData)
        contactForm.reset(contactData)
        bankForm.reset(bankData)
      })
      .catch(() => {
        toast.error('Failed to load some settings. Using defaults.')
      })
      .finally(() => setLoading(false))
  }, [aboutForm, contactForm, bankForm])

  // Save Handlers
  async function onSaveAbout(data: AboutForm) {
    try {
      await saveAboutContent(data)
      toast.success('About Us content updated successfully!')
    } catch {
      toast.error('Could not save About Us content. Please try again.')
    }
  }

  async function onSaveContact(data: ContactForm) {
    try {
      await saveContactContent(data)
      toast.success('Contact Us details updated successfully!')
    } catch {
      toast.error('Could not save Contact Us details. Please try again.')
    }
  }

  async function onSaveBank(data: BankForm) {
    try {
      await saveBankDetails(data as BankDetails)
      toast.success('Bank transfer details updated successfully!')
    } catch {
      toast.error('Could not save Bank transfer details. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-deep-blue sm:text-3xl">
            Site Settings & Content
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your public page content and student bank transfer payment details.
          </p>
        </div>

        {/* Quick public page links */}
        <div className="flex items-center gap-3">
          <Link
            href="/about"
            target="_blank"
            className="rounded-lab border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-deep-blue transition hover:bg-gray-50"
          >
            Preview About ↗
          </Link>
          <Link
            href="/contact"
            target="_blank"
            className="rounded-lab border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-deep-blue transition hover:bg-gray-50"
          >
            Preview Contact ↗
          </Link>
        </div>
      </div>

      {/* Unified Tab Switcher */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('about')}
          className={`flex items-center gap-2 rounded-lab px-4 py-2.5 text-sm font-bold transition-all ${
            activeTab === 'about'
              ? 'bg-electric-blue text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-blue-light/50'
          }`}
        >
          <span>ℹ️</span>
          <span>About Us Content</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('contact')}
          className={`flex items-center gap-2 rounded-lab px-4 py-2.5 text-sm font-bold transition-all ${
            activeTab === 'contact'
              ? 'bg-electric-blue text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-blue-light/50'
          }`}
        >
          <span>📞</span>
          <span>Contact Us Content</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bank')}
          className={`flex items-center gap-2 rounded-lab px-4 py-2.5 text-sm font-bold transition-all ${
            activeTab === 'bank'
              ? 'bg-electric-blue text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-blue-light/50'
          }`}
        >
          <span>🏦</span>
          <span>Bank Account Details</span>
        </button>
      </div>

      {/* ------------------------------------------------- Tab 1: About Us */}
      {activeTab === 'about' && (
        <Card>
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-deep-blue">
              About Us Page Content Editor
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Customize the headline, mission, background story, and 4 core principles.
              The hero image displayed on the right is sourced from{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-deep-blue">
                /images/About-us.png
              </code>
              .
            </p>
          </div>

          <form
            onSubmit={aboutForm.handleSubmit(onSaveAbout)}
            className="mt-6 space-y-6"
          >
            {/* Hero Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-electric-blue">
                1. Hero Headline & Subtitle
              </h3>

              <Input
                label="Hero Title"
                name="heroTitle"
                placeholder="Master English the Scientific Way: Test, Try & Talk"
                error={aboutForm.formState.errors.heroTitle?.message}
                register={aboutForm.register('heroTitle')}
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-deep-blue">
                  Hero Subtitle
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lab border border-gray-300 p-3 text-sm outline-none transition focus:border-electric-blue focus:ring-2 focus:ring-electric-blue/20"
                  {...aboutForm.register('heroSubtitle')}
                />
                {aboutForm.formState.errors.heroSubtitle && (
                  <p className="mt-1 text-xs text-seat-reserved">
                    {aboutForm.formState.errors.heroSubtitle.message}
                  </p>
                )}
              </div>
            </div>

            {/* Mission & Story */}
            <div className="grid grid-cols-1 gap-6 border-t border-gray-100 pt-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-electric-blue">
                  2. Mission Section
                </h3>

                <Input
                  label="Mission Title"
                  name="missionTitle"
                  error={aboutForm.formState.errors.missionTitle?.message}
                  register={aboutForm.register('missionTitle')}
                />

                <div>
                  <label className="mb-1 block text-sm font-medium text-deep-blue">
                    Mission Description
                  </label>
                  <textarea
                    rows={4}
                    className="w-full rounded-lab border border-gray-300 p-3 text-sm outline-none transition focus:border-electric-blue focus:ring-2 focus:ring-electric-blue/20"
                    {...aboutForm.register('missionDescription')}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-electric-blue">
                  3. Origin Story Section
                </h3>

                <Input
                  label="Story Title"
                  name="storyTitle"
                  error={aboutForm.formState.errors.storyTitle?.message}
                  register={aboutForm.register('storyTitle')}
                />

                <div>
                  <label className="mb-1 block text-sm font-medium text-deep-blue">
                    Story Description
                  </label>
                  <textarea
                    rows={4}
                    className="w-full rounded-lab border border-gray-300 p-3 text-sm outline-none transition focus:border-electric-blue focus:ring-2 focus:ring-electric-blue/20"
                    {...aboutForm.register('storyDescription')}
                  />
                </div>
              </div>
            </div>

            {/* Core Principles */}
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-electric-blue">
                4. The 4 Core Principles
              </h3>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lab border border-blue-light/70 bg-blue-light/10 p-4">
                  <p className="text-xs font-bold text-gray-500">Principle 1</p>
                  <Input
                    label="Title"
                    name="principle1Title"
                    register={aboutForm.register('principle1Title')}
                    className="mt-1"
                  />
                  <Input
                    label="Description"
                    name="principle1Desc"
                    register={aboutForm.register('principle1Desc')}
                    className="mt-2"
                  />
                </div>

                <div className="rounded-lab border border-blue-light/70 bg-blue-light/10 p-4">
                  <p className="text-xs font-bold text-gray-500">Principle 2</p>
                  <Input
                    label="Title"
                    name="principle2Title"
                    register={aboutForm.register('principle2Title')}
                    className="mt-1"
                  />
                  <Input
                    label="Description"
                    name="principle2Desc"
                    register={aboutForm.register('principle2Desc')}
                    className="mt-2"
                  />
                </div>

                <div className="rounded-lab border border-blue-light/70 bg-blue-light/10 p-4">
                  <p className="text-xs font-bold text-gray-500">Principle 3</p>
                  <Input
                    label="Title"
                    name="principle3Title"
                    register={aboutForm.register('principle3Title')}
                    className="mt-1"
                  />
                  <Input
                    label="Description"
                    name="principle3Desc"
                    register={aboutForm.register('principle3Desc')}
                    className="mt-2"
                  />
                </div>

                <div className="rounded-lab border border-blue-light/70 bg-blue-light/10 p-4">
                  <p className="text-xs font-bold text-gray-500">Principle 4</p>
                  <Input
                    label="Title"
                    name="principle4Title"
                    register={aboutForm.register('principle4Title')}
                    className="mt-1"
                  />
                  <Input
                    label="Description"
                    name="principle4Desc"
                    register={aboutForm.register('principle4Desc')}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                loading={aboutForm.formState.isSubmitting}
                className="w-full sm:w-auto"
              >
                Save About Us Content 💾
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ------------------------------------------------ Tab 2: Contact Us */}
      {activeTab === 'contact' && (
        <Card>
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-deep-blue">
              Contact Us Page Details Editor
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Configure support contact channels, operating hours, and the direct
              WhatsApp number. The hero image is sourced from{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-deep-blue">
                /images/Contact-Us.png
              </code>
              .
            </p>
          </div>

          <form
            onSubmit={contactForm.handleSubmit(onSaveContact)}
            className="mt-6 space-y-6"
          >
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-electric-blue">
                1. Page Headline & Subtitle
              </h3>

              <Input
                label="Heading"
                name="heading"
                error={contactForm.formState.errors.heading?.message}
                register={contactForm.register('heading')}
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-deep-blue">
                  Subheading
                </label>
                <textarea
                  rows={2}
                  className="w-full rounded-lab border border-gray-300 p-3 text-sm outline-none transition focus:border-electric-blue focus:ring-2 focus:ring-electric-blue/20"
                  {...contactForm.register('subheading')}
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-electric-blue">
                2. Contact Channels & WhatsApp
              </h3>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Support Email"
                  name="email"
                  type="email"
                  error={contactForm.formState.errors.email?.message}
                  register={contactForm.register('email')}
                />

                <Input
                  label="Phone Number"
                  name="phone"
                  placeholder="+94 77 212 8573"
                  error={contactForm.formState.errors.phone?.message}
                  register={contactForm.register('phone')}
                />

                <div className="sm:col-span-2">
                  <Input
                    label="WhatsApp Number (Digits only with country code, e.g. 94772128573)"
                    name="whatsappNumber"
                    placeholder="94772128573"
                    error={contactForm.formState.errors.whatsappNumber?.message}
                    register={contactForm.register('whatsappNumber')}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This number will power the direct &ldquo;Contact via
                    WhatsApp&rdquo; button on the Contact Us page.
                  </p>
                </div>

                <Input
                  label="Physical Location / Campus"
                  name="address"
                  error={contactForm.formState.errors.address?.message}
                  register={contactForm.register('address')}
                />

                <Input
                  label="Operating Hours"
                  name="operatingHours"
                  placeholder="Monday – Saturday: 8:30 AM – 7:30 PM (IST)"
                  error={contactForm.formState.errors.operatingHours?.message}
                  register={contactForm.register('operatingHours')}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                loading={contactForm.formState.isSubmitting}
                className="w-full sm:w-auto"
              >
                Save Contact Us Details 💾
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ------------------------------------------------ Tab 3: Bank Details */}
      {activeTab === 'bank' && (
        <Card>
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-deep-blue">
              Bank Account Details (Cash & Bank Transfer)
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              These details are presented to students on the booking payment page
              when they select manual bank transfer.
            </p>
          </div>

          <div className="mt-4 rounded-lab border border-blue-light bg-blue-light/30 p-4">
            <p className="text-xs font-semibold text-deep-blue">
              🔒 Security & Workflow Note:
            </p>
            <p className="mt-0.5 text-xs text-gray-600">
              Students transfer funds directly to this bank account and upload or
              WhatsApp their transaction slip. Admins manually confirm the seat in
              the Students / Bookings tab.
            </p>
          </div>

          <form
            onSubmit={bankForm.handleSubmit(onSaveBank)}
            className="mt-6 space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Account Name"
                name="accountName"
                placeholder="Language Labs (Pvt) Ltd"
                error={bankForm.formState.errors.accountName?.message}
                register={bankForm.register('accountName')}
              />

              <Input
                label="Account Number"
                name="accountNumber"
                placeholder="0012-3456-7890"
                error={bankForm.formState.errors.accountNumber?.message}
                register={bankForm.register('accountNumber')}
              />

              <Input
                label="Bank Name"
                name="bankName"
                placeholder="Commercial Bank of Ceylon"
                error={bankForm.formState.errors.bankName?.message}
                register={bankForm.register('bankName')}
              />

              <Input
                label="Branch"
                name="branch"
                placeholder="Colombo Main Branch"
                error={bankForm.formState.errors.branch?.message}
                register={bankForm.register('branch')}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-deep-blue">
                Special Payment Instructions (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Please put your Student Name and registered Email as the payment reference..."
                className="w-full rounded-lab border border-gray-300 p-3 text-sm outline-none transition focus:border-electric-blue focus:ring-2 focus:ring-electric-blue/20"
                {...bankForm.register('instructions')}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                loading={bankForm.formState.isSubmitting}
                className="w-full sm:w-auto"
              >
                Save Bank Account Details 💾
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}
