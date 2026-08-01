import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
  /** 'dark' = white text for dark backgrounds; 'light' = deep-blue text for white cards */
  theme?: 'dark' | 'light'
  /** Where the logo links to — '/' for public pages, /admin or /dashboard inside those areas */
  href?: string
  onClick?: () => void
}

/** Language Labs logo lockup — image mark + wordmark */
export default function Logo({ theme = 'dark', href = '/', onClick }: LogoProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="inline-flex items-center gap-2.5"
    >
      <Image
        src="/images/Logo1_no_bg.png"
        alt="Language Labs"
        width={60}
        height={65}
        priority
        className="h-8.5 w-auto md:h-10"
      />
      <span
        className={`text-lg font-bold uppercase md:text-xl ${
          theme === 'dark' ? 'text-lab-white' : 'text-deep-blue'
        }`}
      >
        Language <span className="text-electric-blue">Labs</span>
      </span>
    </Link>
  )
}
