'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { getContactContent, defaultContactContent } from '@/lib/siteSettings'
import type { ContactContent } from '@/types'

export default function ContactPage() {
  const [content, setContent] = useState<ContactContent>(defaultContactContent)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formMessage, setFormMessage] = useState('')

  useEffect(() => {
    getContactContent().then((data) => setContent(data))
  }, [])

  // Clean WhatsApp number (digits only)
  const rawNumber = content.whatsappNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '94772128573'
  const cleanWhatsapp = rawNumber.replace(/\D/g, '')

  const defaultWaUrl = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
    'Hello Language Labs! I would like to inquire about your English learning batches.'
  )}`

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = `Hello Language Labs!%0A%0A*Name:* ${encodeURIComponent(
      formName
    )}%0A*Email:* ${encodeURIComponent(formEmail)}%0A*Phone:* ${encodeURIComponent(
      formPhone
    )}%0A*Message:* ${encodeURIComponent(formMessage)}`

    window.open(`https://wa.me/${cleanWhatsapp}?text=${text}`, '_blank')
  }

  return (
    <div className="bg-lab-white text-deep-blue">
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-light/50 via-lab-white to-lab-white py-16 sm:py-24">
        {/* Subtle decorative glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-electric-blue/10 blur-3xl"
        />

        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-8">
            {/* Left Column: Heading, Direct WhatsApp Button, Contact Cards & Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-7"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-electric-blue/30 bg-blue-light px-3.5 py-1 text-xs font-bold text-electric-blue">
                <span>💬</span>
                <span>We&apos;re Here to Help</span>
              </div>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-deep-blue sm:text-5xl sm:leading-tight">
                {content.heading}
              </h1>

              <p className="mt-4 text-base leading-relaxed text-gray-600 sm:text-lg">
                {content.subheading}
              </p>

              {/* Direct "Contact via WhatsApp" Button */}
              <div className="mt-8 rounded-[18px] border-2 border-[#25D366]/30 bg-[#25D366]/5 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-[#25D366]" />
                      </span>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        Fastest Support Channel
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      Speak directly with our lab admissions team on WhatsApp.
                    </p>
                  </div>

                  <a
                    href={defaultWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2.5 rounded-lab bg-[#25D366] px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:scale-[1.02] hover:bg-[#1EBE5D] hover:shadow-lg"
                  >
                    <svg
                      className="h-5 w-5 fill-current"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M17.472 14.382c-.301-.15-1.78-.877-2.056-.977-.275-.1-.476-.15-.676.15-.2.301-.776.977-.951 1.178-.176.2-.351.226-.652.075-.301-.15-1.27-.468-2.42-1.493-.896-.799-1.501-1.787-1.677-2.088-.176-.301-.019-.464.132-.614.135-.135.301-.351.451-.527.15-.176.2-.301.301-.501.1-.2.05-.376-.025-.527-.075-.15-.676-1.63-.927-2.232-.244-.587-.492-.507-.676-.516l-.577-.01c-.2 0-.526.075-.802.376-.276.301-1.053 1.028-1.053 2.508s1.078 2.909 1.229 3.109c.15.2 2.122 3.24 5.14 4.544.718.31 1.279.496 1.716.634.722.23 1.38.197 1.9.12.579-.087 1.78-.727 2.03-1.43.251-.702.251-1.304.176-1.43-.075-.126-.276-.201-.577-.351zM12.04 2C6.516 2 2.028 6.488 2.028 12.012c0 1.954.564 3.78 1.54 5.327L2 22l4.82-1.52c1.479.882 3.208 1.38 5.22 1.38 5.524 0 10.012-4.488 10.012-10.012S17.564 2 12.04 2zm0 18.25c-1.734 0-3.344-.503-4.707-1.368l-.337-.213-2.859.902.919-2.787-.234-.372c-.958-1.523-1.502-3.321-1.502-5.234 0-4.557 3.707-8.264 8.264-8.264 4.557 0 8.264 3.707 8.264 8.264 0 4.557-3.707 8.264-8.264 8.264z" />
                    </svg>
                    <span>Contact via WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Contact Information Cards Grid */}
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Phone */}
                <div className="rounded-lab border border-blue-light bg-lab-white p-4 shadow-xs">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-light text-base">
                    📞
                  </span>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                    Phone / Call
                  </p>
                  <p className="mt-0.5 font-bold text-deep-blue">{content.phone}</p>
                </div>

                {/* Email */}
                <div className="rounded-lab border border-blue-light bg-lab-white p-4 shadow-xs">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-light text-base">
                    ✉️
                  </span>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                    Email Address
                  </p>
                  <a
                    href={`mailto:${content.email}`}
                    className="mt-0.5 block truncate font-bold text-electric-blue hover:underline"
                  >
                    {content.email}
                  </a>
                </div>

                {/* Address */}
                <div className="rounded-lab border border-blue-light bg-lab-white p-4 shadow-xs">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-light text-base">
                    📍
                  </span>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                    Location / Campus
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-deep-blue">
                    {content.address}
                  </p>
                </div>

                {/* Hours */}
                <div className="rounded-lab border border-blue-light bg-lab-white p-4 shadow-xs">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-light text-base">
                    ⏰
                  </span>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                    Operating Hours
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-deep-blue">
                    {content.operatingHours}
                  </p>
                </div>
              </div>

              {/* Inquiry Form */}
              <div className="mt-8 rounded-[20px] border border-blue-light bg-lab-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-deep-blue">
                  Send Us a Direct Message
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Fill this out and click send to connect instantly with prefilled details.
                </p>

                <form onSubmit={handleFormSubmit} className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-gray-700">
                        Your Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="John Doe"
                        className="mt-1 w-full rounded-lab border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-electric-blue focus:ring-2 focus:ring-electric-blue/20"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        required
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="+94 77 123 4567"
                        className="mt-1 w-full rounded-lab border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-electric-blue focus:ring-2 focus:ring-electric-blue/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mt-1 w-full rounded-lab border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-electric-blue focus:ring-2 focus:ring-electric-blue/20"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Inquiry / Message
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={formMessage}
                      onChange={(e) => setFormMessage(e.target.value)}
                      placeholder="I'm interested in booking a seat in the upcoming batch..."
                      className="mt-1 w-full rounded-lab border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-electric-blue focus:ring-2 focus:ring-electric-blue/20"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-lab bg-deep-blue py-3 text-sm font-bold text-white shadow-md transition hover:bg-deep-blue/90"
                  >
                    Send Inquiry via WhatsApp 🚀
                  </button>
                </form>
              </div>
            </motion.div>

            {/* Right Column: Hero Image positioned prominently on the right side */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="sticky top-24 flex justify-center lg:col-span-5"
            >
              <div className="relative w-full max-w-md overflow-hidden rounded-[24px] border-4 border-white bg-gradient-to-br from-blue-light to-white p-2 shadow-2xl ring-1 ring-black/5">
                <Image
                  src="/images/Contact-Us.png"
                  alt="Language Labs — Contact Us"
                  width={1086}
                  height={1448}
                  priority
                  className="h-auto w-full rounded-[20px] object-cover"
                />

                {/* Bottom glass banner */}
                <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/60 bg-deep-blue/85 p-3.5 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#25D366] text-xl text-white shadow-sm">
                      💬
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white">
                        Direct Lab Hotline
                      </p>
                      <p className="truncate text-[11px] text-blue-light/90">
                        {content.phone} • {content.operatingHours}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
