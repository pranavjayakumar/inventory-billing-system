import type { InputHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  containerClassName?: string
}

export default function TextField({
  label,
  containerClassName = '',
  className = '',
  ...rest
}: TextFieldProps) {
  return (
    <label className={`flex flex-col gap-1 ${containerClassName}`}>
      <span className="text-xs font-medium text-ink/60">{label}</span>
      <input
        className={`h-11 w-full rounded-lg border border-border bg-paper px-3 text-sm outline-none placeholder:text-ink/40 focus:border-turmeric ${className}`}
        {...rest}
      />
    </label>
  )
}
