import type { InputHTMLAttributes } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  name: string
  error?: string
  /** Spread of react-hook-form's register("field") */
  register?: UseFormRegisterReturn
  /** Element rendered inside the input's right edge, e.g. a show/hide toggle */
  suffix?: React.ReactNode
}

export default function Input({
  label,
  name,
  type = 'text',
  placeholder,
  error,
  register,
  required,
  suffix,
  ...rest
}: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-deep-blue">
        {label}
        {required && <span className="ml-0.5 text-seat-reserved">*</span>}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          aria-invalid={!!error}
          className={`w-full rounded-lab border bg-lab-white px-4 py-2.5 text-deep-blue placeholder:text-gray-400 outline-none transition-colors focus:border-deep-blue ${
            suffix ? 'pr-11' : ''
          } ${error ? 'border-seat-reserved' : 'border-gray-300'}`}
          {...register}
          {...rest}
        />
        {suffix && (
          <span className="absolute inset-y-0 right-3 flex items-center">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-sm text-seat-reserved">{error}</p>}
    </div>
  )
}
