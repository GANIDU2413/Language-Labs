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
    // bg-black is only a fallback (shows briefly while the video loads, or
    // if it fails) — bg-deep-blue removed since the video is the background now.
    <section className="relative h-[82vh] min-h-140 overflow-hidden bg-black md:h-screen">
      {/* Background video — object-cover on every breakpoint so it always
          fills the section completely (zero letterbox bars = zero gap
          against the navbar above or CourseOverview below).
          Mobile height is 82vh (not a full 100vh) specifically so the video
          doesn't have to zoom in as hard to cover it — less width gets
          cropped than a full-height container would need. */}
      <video
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
        className="absolute inset-0 z-0 h-full w-full object-cover object-center"
        src="/videos/Welcoming Animation.mp4"
      />

      {/* Dark overlay for text legibility — heaviest at the bottom, where
          the mobile content sits, fading out toward the top of the video. */}
      <div
        aria-hidden
        className="absolute inset-0 z-1 bg-linear-to-t from-black/75 via-black/25 to-transparent md:from-black/60 md:via-black/20"
      />

      {/* Floating bubbles — above the overlay, below the text */}
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
          className="absolute -bottom-12 z-5 rounded-full bg-electric-blue"
          style={{
            left: bubble.left,
            width: bubble.size,
            height: bubble.size,
            opacity: bubble.opacity,
          }}
        />
      ))}

      {/* Content — left-aligned against the page edge with padding (no
          mx-auto/max-w centring column). Anchored to the bottom on mobile
          (sits below/under the video's main frame), vertically centred
          from md upward. */}
      <div className="relative z-10 flex h-[82vh] min-h-140 flex-col justify-end px-8 pb-16 pt-6 md:h-screen md:justify-center md:px-20">
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.15 }}
          className="max-w-2xl text-left"
        >
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-4xl font-bold leading-tight text-lab-white sm:text-5xl"
          >
            Welcome to Your{' '} <br/>
            <span className="text-electric-blue">Language Lab</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mt-4 text-xl font-semibold text-blue-light"
          >
            It&apos;s Your Safe Space to Try, Test &amp; Talk.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mt-8 flex flex-col items-start gap-4 sm:flex-row"
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
      </div>
    </section>
  )
}
