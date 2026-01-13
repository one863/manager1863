import { h } from 'preact';

interface CardProps {
  children: any;
  title?: string;
  className?: string;
  noPadding?: boolean;
}

export default function Card({
  children,
  title,
  className = '',
  noPadding = false,
}: CardProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}
    >
      {title && (
        <div className="bg-paper-dark px-4 py-2 border-b border-gray-200">
          <h3 className="text-xs font-bold text-ink-light uppercase tracking-wider">
            {title}
          </h3>
        </div>
      )}
      <div className={noPadding ? '' : 'p-4'}>{children}</div>
    </div>
  );
}
