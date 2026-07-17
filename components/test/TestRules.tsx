'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface TestRulesProps {
  /** Called when the student clicks "Start My Test" */
  onStart: () => void
  /** Called once microphone permission resolves (true = granted) */
  onMicGranted: (granted: boolean) => void
}

type MicStatus = 'pending' | 'granted' | 'denied'

const rules = [
  {
    icon: '🧪',
    text: 'This is your safe space — there are no wrong answers, only chances to discover your level!',
  },
  {
    icon: '⏭️',
    text: 'Once you move to the next question, you cannot go back — so take your time with each one.',
  },
  {
    icon: '📋',
    text: 'The test has 4 sections: Reading, Vocabulary, Listening and Speaking.',
  },
  {
    icon: '🌱',
    text: "Don't worry about getting everything right — this helps us find the best starting point for you.",
  },
  {
    icon: '🤫',
    text: "Make sure you're in a quiet place for the speaking section.",
  },
]

// Deterministic bubble configs (no Math.random — keeps SSR and client HTML identical)
const bubbles = Array.from({ length: 10 }, (_, i) => ({
  left: `${(i * 10.7 + 3) % 95}%`,
  size: 10 + ((i * 11) % 30),
  opacity: 0.08 + ((i * 7) % 20) / 100,
  duration: 10 + ((i * 3) % 9),
  delay: (i * 1.9) % 7,
}))

export default function TestRules({ onStart, onMicGranted }: TestRulesProps) {
  const [micStatus, setMicStatus] = useState<MicStatus>('pending')
  const onMicGrantedRef = useRef(onMicGranted)
  onMicGrantedRef.current = onMicGranted

  async function requestMic() {
    setMicStatus('pending')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // We only need the permission — release the mic until the speaking section
      stream.getTracks().forEach((track) => track.stop())
      setMicStatus('granted')
      onMicGrantedRef.current(true)
    } catch {
      setMicStatus('denied')
      onMicGrantedRef.current(false)
    }
  }

  useEffect(() => {
    requestMic()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-deep-blue px-4 py-10">
      {/* Floating lab bubbles */}
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
          className="absolute -bottom-10 rounded-full bg-electric-blue"
          style={{
            left: bubble.left,
            width: bubble.size,
            height: bubble.size,
            opacity: bubble.opacity,
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-xl"
      >
        <Card>
          <h1 className="text-center text-2xl font-bold text-deep-blue sm:text-3xl">
            Welcome to Your English Experiment! 🔬
          </h1>
          <p className="mt-2 text-center text-sm font-medium text-electric-blue">
            ⏱️ Takes about 15–20 minutes
          </p>

          {/* Mic permission status */}
          {micStatus === 'pending' && (
            <p className="mt-5 rounded-lab bg-blue-light px-4 py-3 text-sm text-deep-blue">
              🎙️ Requesting microphone access for the speaking section…
            </p>
          )}
          {micStatus === 'granted' && (
            <p className="mt-5 rounded-lab bg-green-50 px-4 py-3 text-sm text-green-700">
              🎙️ Microphone ready! The speaking section is good to go.
            </p>
          )}
          {micStatus === 'denied' && (
            <div className="mt-5 rounded-lab bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p>
                🎙️ We couldn&apos;t access your microphone, so the speaking
                section will be skipped. No stress — you can still complete the
                rest of the test!
              </p>
              <button
                onClick={requestMic}
                className="mt-2 font-semibold text-electric-blue hover:underline"
              >
                Try allowing the mic again
              </button>
            </div>
          )}

          {/* Rules */}
          <motion.ul
            initial="hidden"
            animate="visible"
            transition={{ staggerChildren: 0.1, delayChildren: 0.3 }}
            className="mt-6 flex flex-col gap-4"
          >
            {rules.map((rule) => (
              <motion.li
                key={rule.icon}
                variants={{
                  hidden: { opacity: 0, x: -16 },
                  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
                }}
                className="flex items-start gap-3"
              >
                <span className="mt-0.5 text-xl">{rule.icon}</span>
                <p className="text-sm text-gray-600">{rule.text}</p>
              </motion.li>
            ))}
          </motion.ul>

          <Button
            size="lg"
            onClick={onStart}
            disabled={micStatus === 'pending'}
            className="mt-8 w-full"
          >
            Start My Test
          </Button>
        </Card>
      </motion.div>
    </div>
  )
}
