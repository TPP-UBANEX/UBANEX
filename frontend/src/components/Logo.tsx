import { cn } from '@/lib/utils'
import logoLight from '@/assets/logo-light.svg'
import logoDark from '@/assets/logo-dark.svg'

interface LogoProps {
  className?: string
}

export function Logo({ className }: LogoProps) {
  return (
    <>
      <img src={logoLight} alt="UBANEX" className={cn('block dark:hidden', className)} />
      <img src={logoDark} alt="UBANEX" className={cn('hidden dark:block', className)} />
    </>
  )
}
