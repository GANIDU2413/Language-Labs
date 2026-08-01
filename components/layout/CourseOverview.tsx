'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

const courseCards = [
  { src: '/images/1.png', hex: '#0DBFBF', rgb: '13,191,191', label: 'Explore Now' },
  { src: '/images/2.png', hex: '#7C3AED', rgb: '124,58,237', label: 'Register' },
  { src: '/images/3.png', hex: '#16A34A', rgb: '22,163,74', label: 'Reserve' },
  { src: '/images/4.png', hex: '#EAB308', rgb: '234,179,8', label: 'Shop' },
  { src: '/images/5.png', hex: '#2563EB', rgb: '37,99,235', label: 'Get Resources' },
  { src: '/images/6.png', hex: '#EA580C', rgb: '234,88,12', label: 'Submit' },
].map((c, i) => ({ ...c, alt: `Course topic ${i + 1}` }))

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const card = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
}

export default function CourseOverview() {
  return (
    <section id="courses" className="bg-lab-white">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold text-deep-blue sm:text-4xl">
          What You&apos;ll Get in the Lab
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-gray-500">
          16 sessions, twice a week, over 2 months — every experiment brings
          you closer to fluent, fearless English.
        </p>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5"
        >
          {courseCards.map((c) => (
            <motion.div
              key={c.src}
              variants={card}
              className="overflow-hidden rounded-[20px] border-2 border-[rgba(255,255,255,0.45)] shadow-[0_8px_32px_rgba(0,0,0,0.15)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.20)]"
              style={{
                background: `rgba(${c.rgb},0.85)`,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              {/* Image area — zero padding on top/left/right (wrapper hugs
                  the card edge exactly), a little room at the bottom before
                  the button row. No fixed height / object-fit: the wrapper
                  sizes itself to the image's own aspect ratio (w-full,
                  h-auto) instead of forcing every image into an arbitrary
                  box, so nothing is ever cropped or letterboxed. */}
              <div className="w-full p-2">
                <div className="w-full overflow-hidden rounded-xl bg-white/95">
                  <Image
                    src={c.src}
                    alt={c.alt}
                    width={600}
                    height={400}
                    className="h-auto w-full rounded-xl"
                  />
                </div>
              </div>

              {/* Bottom bar — no separate dark strip, same colour as the
                  rest of the card */}
              <div className="flex items-center justify-center px-4 py-3">
                <button
                  type="button"
                  className="rounded-full border border-white/40 px-7 py-2 text-sm font-bold text-white transition-all duration-200 hover:scale-105 hover:bg-white/25"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    cursor: 'pointer',
                  }}
                >
                  {c.label}
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
