import { h } from 'preact';

interface ButtonProps {
  children: any;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  disabled?: boolean;
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
}: ButtonProps) {
  const baseStyles =
    'w-full py-3 px-4 rounded font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-accent text-white shadow-lg border-b-4 border-amber-900 active:border-b-0 active:translate-y-1',
    secondary:
      'bg-paper-dark text-ink border-2 border-gray-300 hover:bg-gray-200',
    danger: 'bg-red-600 text-white shadow-md active:translate-y-0.5',
    ghost: 'bg-transparent text-ink-light hover:text-ink',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
