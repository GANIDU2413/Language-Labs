'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import type { Lab, Seat, SeatStatus } from '@/types'

interface SeatPickerProps {
  labId: string
  /** Called with the chosen desk number when the student confirms */
  onSeatSelected: (deskNumber: number) => void
}

const statusLabels: Record<SeatStatus, string> = {
  available: 'Available',
  confirmed: 'Reserved',
  pending: 'Pending',
}

const statusClasses: Record<SeatStatus, string> = {
  available:
    'bg-seat-available text-lab-white cursor-pointer hover:scale-105 active:scale-95',
  confirmed: 'bg-seat-reserved text-lab-white cursor-not-allowed',
  pending: 'bg-seat-unavailable text-lab-white cursor-not-allowed',
}

function DeskCard({
  seat,
  isSelected,
  onSelect,
}: {
  seat: Seat
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <div className="relative">
      {/* Pulsing selection ring */}
      {isSelected && (
        <motion.span
          aria-hidden
          animate={{ scale: [1, 1.06, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="absolute -inset-1 rounded-[16px] border-4 border-electric-blue"
        />
      )}
      <button
        onClick={onSelect}
        disabled={seat.status !== 'available'}
        aria-label={`Desk ${seat.seatNumber} — ${statusLabels[seat.status]}`}
        className={`relative flex w-full flex-col items-center gap-1 rounded-lab p-4 transition-transform ${statusClasses[seat.status]}`}
      >
        <span className="text-3xl">🧑‍🎓</span>
        <span className="font-bold">Desk {seat.seatNumber}</span>
        <span className="text-xs opacity-90">{statusLabels[seat.status]}</span>
      </button>
    </div>
  )
}

export default function SeatPicker({ labId, onSeatSelected }: SeatPickerProps) {
  const [seats, setSeats] = useState<Seat[] | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)

  // Live seat status straight from the lab document
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'labs', labId),
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true)
          return
        }
        const lab = snap.data() as Lab
        const sorted = [...(lab.seats ?? [])].sort(
          (a, b) => a.seatNumber - b.seatNumber
        )
        setSeats(sorted)
        // Deselect if someone else just took our chosen seat
        setSelected((current) =>
          current !== null &&
          sorted.find((s) => s.seatNumber === current)?.status !== 'available'
            ? null
            : current
        )
      },
      () => setNotFound(true)
    )
    return unsubscribe
  }, [labId])

  if (notFound) {
    return (
      <p className="py-10 text-center text-gray-600">
        This lab could not be found — it may have been removed.
      </p>
    )
  }

  if (!seats) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const leftSeats = seats.slice(0, 3)
  const rightSeats = seats.slice(3, 6)

  return (
    <div className="mx-auto w-full max-w-lg">
      {/* Teacher / board area */}
      <div className="relative w-full overflow-hidden rounded-lab shadow-sm">
        <Image
          src="/images/Teacher&Whiteboard.jpg"
          alt="Teacher & Whiteboard"
          width={2749}
          height={666}
          priority
          className="h-auto w-full rounded-lab object-cover"
        />
      </div>
      <p className="mt-1 text-center text-xs uppercase tracking-widest text-gray-400">
        Front of the lab
      </p>

      {/* Desks — two columns with an aisle */}
      <div className="mt-6 grid grid-cols-2 gap-x-10 gap-y-4 sm:gap-x-16">
        <div className="flex flex-col gap-4">
          {leftSeats.map((seat) => (
            <DeskCard
              key={seat.seatNumber}
              seat={seat}
              isSelected={selected === seat.seatNumber}
              onSelect={() => setSelected(seat.seatNumber)}
            />
          ))}
        </div>
        <div className="flex flex-col gap-4">
          {rightSeats.map((seat) => (
            <DeskCard
              key={seat.seatNumber}
              seat={seat}
              isSelected={selected === seat.seatNumber}
              onSelect={() => setSelected(seat.seatNumber)}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600">
        <span>🔵 Available</span>
        <span>🔴 Reserved</span>
        <span>⚫ Pending Payment</span>
      </div>

      {/* Confirmation bar */}
      <AnimatePresence>
        {selected !== null && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25 }}
            className="mt-6 flex flex-col items-center gap-3 rounded-lab bg-blue-light p-5 text-center sm:flex-row sm:justify-between sm:text-left"
          >
            <p className="font-semibold text-deep-blue">
              You selected Desk {selected} — Ready to book?
            </p>
            <Button onClick={() => onSeatSelected(selected)}>
              Confirm Seat
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
