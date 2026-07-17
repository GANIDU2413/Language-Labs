'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

// Deterministic bubble configs (no Math.random — keeps SSR and client HTML identical)
const bubbles = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 7.3 + 4) % 96}%`,
  size: 8 + ((i * 13) % 36),
  opacity: 0.12 + ((i * 5) % 30) / 100,
  duration: 9 + ((i * 3) % 10),
  delay: (i * 1.7) % 8,
}))

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-deep-blue">
      {/* Floating bubbles */}
      {bubbles.map((bubble, i) => (
        <motion.span
          key={i}
          aria-hidden
          initial={{ y: 0 }}
          animate={{ y: '-110vh' }}
          transition={{
            duration: bubble.duration,
            delay: bubble.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute -bottom-12 rounded-full bg-electric-blue"
          style={{
            left: bubble.left,
            width: bubble.size,
            height: bubble.size,
            opacity: bubble.opacity,
          }}
        />
      ))}

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2 md:py-28">
        {/* Text */}
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.15 }}
          className="text-center md:text-left"
        >
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-4xl font-bold leading-tight text-lab-white sm:text-5xl"
          >
            Welcome to Your{' '}
            <span className="text-electric-blue">Language Lab</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mt-4 text-xl font-semibold text-blue-light"
          >
            It&apos;s Your Safe Space to Try, Test &amp; Talk.
          </motion.p>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mx-auto mt-4 max-w-md text-gray-300 md:mx-0"
          >
            Scared of speaking English? Not in here. Our lab is where mistakes
            are experiments, every attempt teaches you something, and
            confidence is the result.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mt-8 flex flex-col items-center gap-4 sm:flex-row md:justify-start sm:justify-center"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="w-full sm:w-auto"
            >
              <Link
                href="/register"
                className="block rounded-lab bg-electric-blue px-8 py-3 text-center font-semibold text-lab-white transition-colors hover:bg-electric-blue/90"
              >
                Test Your English
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="w-full sm:w-auto"
            >
              <a
                href="#courses"
                className="block rounded-lab border border-electric-blue px-8 py-3 text-center font-semibold text-electric-blue transition-colors hover:bg-electric-blue/10"
              >
                Learn More
              </a>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Lab animation — REPLACE WITH LAB LOTTIE ANIMATION */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative mx-auto flex h-64 w-64 items-center justify-center sm:h-80 sm:w-80"
        >
          {/* Pulsing rings placeholder until the Lottie file is added */}
          <motion.span
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.15, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-electric-blue/20"
          />
          <motion.span
            animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.2, 0.4] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.5,
            }}
            className="absolute inset-6 rounded-full bg-electric-blue/25"
          />
          <motion.span
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="relative text-8xl sm:text-9xl"
          >
            🧪
          </motion.span>
        </motion.div>
      </div>
    </section>
  )
}
