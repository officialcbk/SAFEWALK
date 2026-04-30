import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, type, className = '', id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type;
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-[6px]">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[12px] font-semibold text-[#888899] tracking-[0.2px]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={[
              'w-full h-[52px] px-[14px] text-[15px] text-[#1A1A28] bg-white border rounded-[12px] outline-none transition-all font-[Inter,sans-serif]',
              'placeholder:text-[#888899]',
              error
                ? 'border-[#E24B4A] focus:border-[#E24B4A] focus:shadow-[0_0_0_3px_rgba(226,75,74,0.15)]'
                : 'border-[#E0E0E8] focus:border-[#7F77DD] focus:shadow-[0_0_0_3px_rgba(127,119,221,0.15)]',
              type === 'password' ? 'pr-11' : '',
              className,
            ].join(' ')}
            {...props}
          />
          {type === 'password' && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888899] hover:text-[#1A1A28] p-1.5"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {error && <p className="text-[12px] text-[#A32D2D]">{error}</p>}
        {helperText && !error && <p className="text-[12px] text-[#888899]">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
