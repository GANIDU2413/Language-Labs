'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { getAboutContent, defaultAboutContent } from '@/lib/siteSettings'
import type { AboutContent } from '@/types'

export default function AboutPage() {
  const [content, setContent] = useState<AboutContent>(defaultAboutContent)

  useEffect(() => {
    getAboutContent().then((data) => setContent(data))
  }, [])

  return (
    <div className="bg-lab-white text-deep-blue">
      {/* ------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-light/50 via-lab-white to-lab-white py-16 sm:py-24">
        {/* Subtle decorative lab background glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-electric-blue/10 blur-3xl"
        />

        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
            {/* Left Column: Mission & Headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-7"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-electric-blue/30 bg-blue-light px-3.5 py-1 text-xs font-bold text-electric-blue">
                <span>🧪</span>
                <span>The English Experiment</span>
              </div>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-deep-blue sm:text-5xl sm:leading-tight">
                {content.heroTitle}
              </h1>

              <p className="mt-5 text-base leading-relaxed text-gray-600 sm:text-lg">
                {content.heroSubtitle}
              </p>

              {/* Call to action buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/available-labs"
                  className="rounded-lab bg-electric-blue px-6 py-3.5 text-sm font-bold text-lab-white shadow-md transition-all hover:bg-electric-blue/90 hover:shadow-lg"
                >
                  Explore Available Labs 🚀
                </Link>
                <Link
                  href="/test"
                  className="rounded-lab border border-electric-blue/40 bg-white px-6 py-3.5 text-sm font-bold text-deep-blue transition-all hover:bg-blue-light/60"
                >
                  Take Free Level Test 📝
                </Link>
              </div>

              {/* Quick Trust Badges */}
              <div className="mt-10 grid grid-cols-3 gap-4 border-t border-blue-light pt-6">
                <div>
                  <p className="text-2xl font-black text-electric-blue sm:text-3xl">6</p>
                  <p className="text-xs font-medium text-gray-500 sm:text-sm">
                    Seats Max Per Lab
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-black text-electric-blue sm:text-3xl">16</p>
                  <p className="text-xs font-medium text-gray-500 sm:text-sm">
                    Hands-On Sessions
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-black text-electric-blue sm:text-3xl">100%</p>
                  <p className="text-xs font-medium text-gray-500 sm:text-sm">
                    Microphone Practice
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Hero Image positioned prominently */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative flex justify-center lg:col-span-5"
            >
              <div className="relative w-full max-w-md overflow-hidden rounded-[24px] border-4 border-white bg-gradient-to-br from-blue-light to-white p-2 shadow-2xl ring-1 ring-black/5">
                <Image
                  src="/images/About-us.png"
                  alt="Language Labs — About Us"
                  width={1024}
                  height={1024}
                  priority
                  className="h-auto w-full rounded-[20px] object-cover"
                />

                {/* Ambient science badge overlay */}
                <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/60 bg-deep-blue/80 p-3 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-electric-blue text-lg text-white">
                      🔬
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white">
                        Language Labs Academy
                      </p>
                      <p className="text-[11px] text-blue-light/80">
                        Intimate 6-seat speaking laboratories
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Story & Mission */}
      <section className="bg-blue-light/30 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Mission Card */}
            <div className="rounded-[20px] border border-blue-light bg-lab-white p-8 shadow-sm transition-all hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-light text-2xl">
                🎯
              </div>
              <h2 className="mt-5 text-2xl font-bold text-deep-blue">
                {content.missionTitle}
              </h2>
              <p className="mt-3 leading-relaxed text-gray-600">
                {content.missionDescription}
              </p>
            </div>

            {/* Story Card */}
            <div className="rounded-[20px] border border-blue-light bg-lab-white p-8 shadow-sm transition-all hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-light text-2xl">
                💡
              </div>
              <h2 className="mt-5 text-2xl font-bold text-deep-blue">
                {content.storyTitle}
              </h2>
              <p className="mt-3 leading-relaxed text-gray-600">
                {content.storyDescription}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Final CTA */}
      <section className="bg-deep-blue py-16 sm:py-24 text-lab-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            Ready to Take Your First Speaking Experiment?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-gray-300 sm:text-base">
            Take our free 4-part level test or reserve one of the 6 desks in an upcoming batch.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/test"
              className="rounded-lab bg-electric-blue px-7 py-3.5 text-sm font-bold text-lab-white shadow-md transition-all hover:bg-electric-blue/90"
            >
              Start Free Level Test 🧪
            </Link>
            <Link
              href="/available-labs"
              className="rounded-lab border border-white/30 px-7 py-3.5 text-sm font-bold text-lab-white transition-all hover:bg-white/10"
            >
              View Upcoming Labs
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
