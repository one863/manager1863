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
      'bg-black text-white shadow-sm hover:bg-gray-900 active:scale-95 transition-transform',
    secondary:
      'bg-white text-black border border-gray-300 hover:bg-gray-50 active:scale-95 transition-transform',
    danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50 active:scale-95',
    ghost: 'bg-transparent text-gray-500 hover:text-black',
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
