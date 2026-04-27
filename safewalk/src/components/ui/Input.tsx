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
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-[8px] font-bold uppercase tracking-wide text-[#888899]">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={[
              'w-full h-10 px-[10px] text-[11px] text-[#1A1A28] bg-[#F0F0F4] border rounded-[6px] outline-none transition-all',
              'placeholder:text-[#888899]',
              error
                ? 'border-[#E24B4A] focus:border-[#E24B4A] focus:ring-2 focus:ring-[#E24B4A]/20'
                : 'border-[#E0E0E8] focus:border-[#7F77DD] focus:ring-2 focus:ring-[#7F77DD]/15',
              type === 'password' ? 'pr-10' : '',
              'min-h-[48px]',
              className,
            ].join(' ')}
            {...props}
          />
          {type === 'password' && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888899] hover:text-[#1A1A28]"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
        </div>
        {error && <p className="text-[9px] text-[#A32D2D]">{error}</p>}
        {helperText && !error && <p className="text-[9px] text-[#888899]">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
