import { h } from 'preact';
import { Coins } from 'lucide-preact';

interface CreditAmountProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: string;
}

export default function CreditAmount({ 
  amount, 
  size = 'md', 
  className = "", 
  color = "text-green-700" 
}: CreditAmountProps) {
  
  const sizes = {
    sm: { text: "text-xs", icon: 12 },
    md: { text: "text-sm", icon: 14 },
    lg: { text: "text-lg", icon: 20 }
  };

  return (
    <span className={`inline-flex items-center gap-1 font-bold font-mono ${color} ${sizes[size].text} ${className}`}>
      <Coins size={sizes[size].icon} className="shrink-0" />
      {amount.toLocaleString()}
    </span>
  );
}
