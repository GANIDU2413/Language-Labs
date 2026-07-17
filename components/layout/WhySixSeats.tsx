'use client'

import { motion } from 'framer-motion'

const benefits = [
  {
    icon: '🎤',
    title: 'Max Speaking Practice',
    description:
      'Fewer students means the mic reaches you many times every session.',
  },
  {
    icon: '👥',
    title: 'Personal Attention',
    description:
      'Your tutor knows your name, your goals and exactly where you struggle.',
  },
  {
    icon: '💪',
    title: 'Confidence Building',
    description:
      'A small, friendly group is the safest place to make mistakes and grow.',
  },
  {
    icon: '🙋',
    title: 'Active Participation',
    description:
      'No hiding in the back row — everyone takes part in every experiment.',
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
          viewport={{ once: true, amount: 0.2 }}
          className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {benefits.map((benefit) => (
            <motion.div
              key={benefit.title}
              variants={card}
              className="flex flex-col items-center rounded-lab bg-lab-white p-6 text-center shadow-sm"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-light text-3xl">
                {benefit.icon}
              </span>
              <h3 className="mt-4 font-bold text-deep-blue">{benefit.title}</h3>
              <p className="mt-2 text-sm text-gray-500">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
