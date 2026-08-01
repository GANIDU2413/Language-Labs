'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'

// Deterministic bubble configs (no Math.random — keeps renders stable)
const bubbles = Array.from({ length: 12 }, (_, i) => ({
  left: `${(i * 8.9 + 4) % 94}%`,
  size: 8 + ((i * 15) % 32),
  opacity: 0.1 + ((i * 7) % 25) / 100,
  duration: 4 + ((i * 3) % 5),
  delay: (i * 0.4) % 2.5,
}))

const doorTransition = {
  duration: 0.8,
  ease: [0.65, 0, 0.35, 1] as const,
}

function SplashPanels() {
  return (
    <motion.div
      className="fixed inset-0 z-100"
      exit={{ transition: { duration: 0.8 } }}
      aria-hidden
    >
      {/* Lab doors — slide apart on exit */}
      <motion.div
        exit={{ x: '-100%' }}
        transition={doorTransition}
        className="absolute inset-y-0 left-0 w-1/2 bg-deep-blue"
      />
      <motion.div
        exit={{ x: '100%' }}
        transition={doorTransition}
        className="absolute inset-y-0 right-0 w-1/2 bg-deep-blue"
      />

      {/* Content */}
      <motion.div
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      >
        {/* Rising bubbles */}
        {bubbles.map((bubble, i) => (
          <motion.span
            key={i}
            initial={{ y: 0 }}
            animate={{ y: '-110vh' }}
            transition={{
              duration: bubble.duration,
              delay: bubble.delay,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute -bottom-10 rounded-full bg-electric-blue"
            style={{
              left: bubble.left,
              width: bubble.size,
              height: bubble.size,
              opacity: bubble.opacity,
            }}
          />
        ))}

        {/* Logo image — animates in first */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
        >
          <Image
            src="/images/Logo1_no_bg.png"
            alt="Language Labs Logo"
            width={120}
            height={130}
            priority
            className="h-22.5 w-auto sm:h-30"
          />
        </motion.div>

        {/* Title */}
        <motion.p
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.6 }}
          className="mt-4 text-4xl font-bold uppercase text-lab-white sm:text-5xl"
        >
          Language <span className="text-electric-blue">Labs</span>
        </motion.p>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="mt-4 px-6 text-center text-base text-blue-light sm:text-lg"
        >
          It&apos;s Your Safe Space to Try, Test &amp; Talk.
        </motion.p>
      </motion.div>
    </motion.div>
  )
}

/**
 * "Enter the Lab" splash screen. Shows once per browser session
 * (tracked in sessionStorage), then the lab doors slide open.
 */
export default function EnterLabSplash() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('ll-splash-shown')) return
    sessionStorage.setItem('ll-splash-shown', '1')
    setShow(true)
    const timer = setTimeout(() => setShow(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  return <AnimatePresence>{show && <SplashPanels />}</AnimatePresence>
}
