import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'warning';
type Size = 'sm' | 'md' | 'lg';

const variantStyles: Record<Variant, string> = {
  primary: 'bg-primary hover:bg-primary-hover shadow-lg shadow-primary-shadow hover:shadow-xl hover:shadow-primary-shadow',
  secondary: 'bg-secondary hover:bg-secondary-hover shadow-lg shadow-secondary-shadow hover:shadow-xl hover:shadow-secondary-shadow',
  danger: 'bg-danger/80 hover:bg-danger-hover hover:shadow-lg hover:shadow-red-500/30',
  ghost: 'bg-ghost hover:bg-ghost-hover',
  success: 'bg-success hover:bg-success-hover shadow-lg hover:shadow-xl hover:shadow-green-500/30',
  warning: 'bg-warning hover:bg-warning-hover shadow-lg hover:shadow-xl hover:shadow-orange-500/30',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-4 py-2 rounded-lg text-sm',
  md: 'px-6 py-3 rounded-lg',
  lg: 'px-8 py-3 rounded-xl text-lg',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={`${variantStyles[variant]} ${sizeStyles[size]} hover:scale-[1.03] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40 disabled:hover:scale-100 text-white font-bold transition-[color,background-color,border-color,box-shadow,transform] ${className ?? ''}`}
      {...props}
    />
  );
}
