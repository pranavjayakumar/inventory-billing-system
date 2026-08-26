import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'rounded-xl bg-turmeric font-semibold text-surface',
  secondary: 'rounded-lg bg-paper font-medium text-ink',
  danger: 'rounded-lg bg-chili/10 font-medium text-chili',
  outline: 'rounded-xl border border-dashed border-border font-medium text-ink/70',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 text-sm',
  md: 'h-11 text-sm',
  lg: 'h-12 text-sm',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  iconOnly?: boolean
  fullWidth?: boolean
  /** Share space evenly with siblings in a flex row (e.g. Edit / Deactivate side by side). */
  flex1?: boolean
}

export default function Button({
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  fullWidth = false,
  flex1 = false,
  type = 'button',
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`flex items-center justify-center gap-1.5 disabled:opacity-50 ${
        variantClasses[variant]
      } ${sizeClasses[size]} ${iconOnly ? 'aspect-square' : 'px-4'} ${
        fullWidth ? 'w-full' : flex1 ? 'flex-1' : 'shrink-0'
      } ${className}`}
      {...rest}
    />
  )
}
