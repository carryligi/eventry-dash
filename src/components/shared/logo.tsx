import Image from 'next/image'

interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 32, className }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Eventry"
      width={size}
      height={size}
      className={className}
      priority
    />
  )
}
