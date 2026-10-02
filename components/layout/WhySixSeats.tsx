'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

const seatCards = [
  {
    title: 'Max Speaking Practice',
    src: '/images/6sheat-1.png',
    hex: '#0DBFBF',
    rgb: '13,191,191',
  },
  {
    title: 'Personal Attention',
    src: '/images/6sheat-2.png',
    hex: '#7C3AED',
    rgb: '124,58,237',
  },
  {
    title: 'Confidence Building',
    src: '/images/6sheat-3.png',
    hex: '#16A34A',
    rgb: '22,163,74',
  },
  {
    title: 'Active Participation',
    src: '/images/6sheat-4.png',
    hex: '#EAB308',
    rgb: '234,179,8',
  },
]

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const card = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
}

export default function WhySixSeats() {
  return (
    <section className="bg-blue-light">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold text-deep-blue sm:text-4xl">
          Why Only 6 Seats?
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-gray-600">
          Big classes are where English learners go quiet. Our lab has exactly
          six desks, so every student gets maximum speaking practice and real
          personal attention — the two things that actually make you fluent.
        </p>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4 lg:gap-6"
        >
          {seatCards.map((item) => (
            <motion.div
              key={item.title}
              variants={card}
              className="flex flex-col overflow-hidden rounded-[20px] border-2 border-[rgba(255,255,255,0.45)] shadow-[0_8px_32px_rgba(0,0,0,0.15)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.20)]"
              style={{
                background: `rgba(${item.rgb},0.85)`,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              {/* Image at the top of the card */}
              <div className="w-full p-2">
                <div className="w-full overflow-hidden rounded-xl bg-white/95">
                  <Image
                    src={item.src}
                    alt={item.title}
                    width={544}
                    height={460}
                    className="h-auto w-full rounded-xl object-cover"
                  />
                </div>
              </div>

              {/* Topic placed directly underneath the image */}
              <div className="flex flex-1 items-center justify-center px-3 py-3 text-center sm:px-4 sm:py-4">
                <h3 className="font-bold text-white text-sm sm:text-base lg:text-lg leading-snug drop-shadow-xs">
                  {item.title}
                </h3>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
