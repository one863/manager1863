import { h } from 'preact';

interface PlayerAvatarProps {
  dna: string;
  size?: number;
  className?: string;
}

export default function PlayerAvatar({ dna, size = 48, className = "" }: PlayerAvatarProps) {
  // Parsing du DNA : "skin-hair-facial-eyes"
  const [skinIdx, hairIdx, facialIdx, eyesIdx] = dna.split('-').map(Number);

  // Palettes de couleurs
  const skins = ["#f8d5c2", "#e0ac69", "#8d5524", "#c68642"];
  const hairColors = ["#4b3020", "#2c1e14", "#d6b67d", "#913312", "#000000", "#6b6b6b"];
  
  const skin = skins[skinIdx % skins.length];
  const hair = hairColors[hairIdx % hairColors.length];

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={`rounded-full bg-paper-dark border border-gray-300 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Cou */}
      <rect x="40" y="70" width="20" height="20" fill={skin} />
      
      {/* Visage (Ovale) */}
      <ellipse cx="50" cy="45" rx="35" ry="40" fill={skin} />

      {/* Yeux */}
      <g transform={`translate(0, ${eyesIdx % 2})`}>
        <circle cx="35" cy="40" r="4" fill="white" />
        <circle cx="35" cy="40" r="2" fill="#333" />
        <circle cx="65" cy="40" r="4" fill="white" />
        <circle cx="65" cy="40" r="2" fill="#333" />
      </g>

      {/* Nez */}
      <path d="M 48 45 Q 50 52 52 45" stroke="#333" fill="none" stroke-width="1" />

      {/* Bouche */}
      <path d="M 42 65 Q 50 70 58 65" stroke="#333" fill="none" stroke-width="1.5" />

      {/* Pilosité faciale (Moustache/Barbe 19ème siècle) */}
      {facialIdx > 0 && (
        <g fill={hair} opacity="0.9">
          {facialIdx === 1 && <path d="M 35 58 Q 50 62 65 58 Q 50 65 35 58" />} {/* Moustache fine */}
          {facialIdx === 2 && <path d="M 30 55 Q 50 68 70 55 Q 50 75 30 55" />} {/* Moustache épaisse */}
          {facialIdx === 3 && <path d="M 25 50 Q 50 90 75 50 L 70 45 Q 50 80 30 45 Z" />} {/* Barbe complète */}
          {facialIdx === 4 && (
             <g>
               <path d="M 15 40 Q 20 60 30 70" stroke={hair} stroke-width="6" fill="none" /> {/* Favoris */}
               <path d="M 85 40 Q 80 60 70 70" stroke={hair} stroke-width="6" fill="none" />
             </g>
          )}
        </g>
      )}

      {/* Cheveux */}
      <g fill={hair}>
        {hairIdx === 0 && <path d="M 15 40 Q 50 0 85 40 Q 50 15 15 40" />} {/* Court simple */}
        {hairIdx === 1 && <path d="M 15 45 Q 50 -10 85 45 Q 70 20 50 15 Q 30 20 15 45" />} {/* Volume haut */}
        {hairIdx === 2 && <path d="M 10 50 Q 50 5 90 50 Q 95 60 85 40 Q 50 20 15 40 Q 5 60 10 50" />} {/* Ébouriffé */}
        {hairIdx === 3 && <path d="M 15 40 Q 50 10 85 40 L 90 60 Q 50 50 10 60 Z" />} {/* Raie au milieu */}
        {hairIdx === 4 && <circle cx="50" cy="20" r="10" />} {/* Chauve (juste haut) */}
        {hairIdx === 5 && <path d="M 15 40 Q 10 10 30 5 Q 50 0 70 5 Q 90 10 85 40 Z" />} {/* Chapeau/Haut de forme possible ? Non, restons sur cheveux */}
      </g>
    </svg>
  );
}
