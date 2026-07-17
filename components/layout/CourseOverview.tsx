'use client'

import { motion } from 'framer-motion'

const topics = [
  { icon: '📚', name: 'Vocabulary', description: 'Build the words you actually use every day.' },
  { icon: '🧩', name: 'Grammar', description: 'Understand the patterns instead of memorising rules.' },
  { icon: '🔊', name: 'Pronunciation', description: 'Say it clearly so everyone understands you.' },
  { icon: '🎧', name: 'Listening', description: 'Follow real conversations at real speed.' },
  { icon: '🎤', name: 'Speaking', description: 'Practise out loud in every single session.' },
  { icon: '💬', name: 'Day-to-Day English', description: 'Handle shops, calls and small talk with ease.' },
  { icon: '💼', name: 'Interview Preparation', description: 'Walk into your next interview with confidence.' },
  { icon: '🚀', name: 'Overall Fluency', description: 'Put it all together and just keep talking.' },
]

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
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
          What You&apos;ll Learn in the Lab
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
          className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {topics.map((topic) => (
            <motion.div
              key={topic.name}
              variants={card}
              whileHover={{ y: -6 }}
              className="rounded-lab border border-blue-light bg-lab-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-light text-2xl text-electric-blue">
                {topic.icon}
              </span>
              <h3 className="mt-4 font-bold text-deep-blue">{topic.name}</h3>
              <p className="mt-1 text-sm text-gray-500">{topic.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
