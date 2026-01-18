import { type Team } from "@/core/db/db";

// Preset colors for deterministic generation
const PRESET_COLORS = [
    ["#E11D48", "#FFFFFF"], // Red/White
    ["#2563EB", "#FFFFFF"], // Blue/White
    ["#059669", "#FFFFFF"], // Green/White
    ["#F59E0B", "#000000"], // Yellow/Black
    ["#7C3AED", "#FFFFFF"], // Purple/White
    ["#000000", "#FFFFFF"], // Black/White
    ["#DB2777", "#FFFFFF"], // Pink/White
    ["#EA580C", "#FFFFFF"], // Orange/White
    ["#0D9488", "#FFFFFF"], // Teal/White
    ["#4B5563", "#FFFFFF"], // Gray/White
    ["#DC2626", "#FCD34D"], // Red/Yellow
    ["#1E40AF", "#FCD34D"], // Blue/Yellow
];

export function getTeamColors(team: Team | null) {
    if (!team) return { primary: "#3b82f6", secondary: "#ffffff" };
    
    // Check if colors are explicitly set in DB
    if (team.primaryColor && team.primaryColor !== "#ffffff" && team.primaryColor !== "#000000") {
        return { 
            primary: team.primaryColor, 
            secondary: team.secondaryColor || "#ffffff" 
        };
    }
    
    // Check legacy array format
    if (team.colors && team.colors.length >= 2 && team.colors[0] !== "#ffffff") {
        return { primary: team.colors[0], secondary: team.colors[1] };
    }
    
    // Deterministic fallback based on team name
    let hash = 0;
    const str = team.name || "Team";
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % PRESET_COLORS.length;
    return { primary: PRESET_COLORS[index][0], secondary: PRESET_COLORS[index][1] };
}

// Generate a deterministic hash number for a string
function getHash(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
}

// Different logo components
const ShieldStripes = ({ p, s }: { p: string, s: string }) => (
    <g>
        <rect width="100" height="120" fill={p} />
        <rect x="20" width="15" height="120" fill={s} fillOpacity="0.9" />
        <rect x="52.5" width="15" height="120" fill={s} fillOpacity="0.9" />
        <rect x="85" width="15" height="120" fill={s} fillOpacity="0.9" />
        <circle cx="50" cy="50" r="15" fill={p} stroke={s} strokeWidth="2" />
        <path d="M42 50 L58 50 M50 42 L50 58" stroke={s} strokeWidth="3" strokeLinecap="round" />
    </g>
);

const ShieldHalves = ({ p, s }: { p: string, s: string }) => (
    <g>
        <rect width="50" height="120" fill={p} />
        <rect x="50" width="50" height="120" fill={s} />
        <circle cx="50" cy="50" r="20" fill="white" stroke={p} strokeWidth="2" />
        <text x="50" y="55" fontSize="20" fontWeight="bold" fill={p} textAnchor="middle">FC</text>
    </g>
);

const ShieldV = ({ p, s }: { p: string, s: string }) => (
    <g>
        <rect width="100" height="120" fill={p} />
        <path d="M0 0 L50 60 L100 0 L100 30 L50 90 L0 30 Z" fill={s} />
    </g>
);

const ShieldCross = ({ p, s }: { p: string, s: string }) => (
    <g>
        <rect width="100" height="120" fill={p} />
        <rect x="40" width="20" height="120" fill={s} />
        <rect y="30" width="100" height="20" fill={s} />
    </g>
);

const CircleBadge = ({ p, s }: { p: string, s: string }) => (
    <g>
        <circle cx="50" cy="50" r="48" fill={p} stroke={s} strokeWidth="4" />
        <circle cx="50" cy="50" r="35" fill="none" stroke={s} strokeWidth="1" />
        <path d="M50 15 L50 85 M15 50 L85 50" stroke={s} strokeWidth="2" opacity="0.5" />
        <circle cx="50" cy="50" r="10" fill={s} />
    </g>
);

export const TeamCrest = ({ primary, secondary, size = "md", name, type }: { primary: string, secondary: string, size?: "sm" | "md" | "lg", name?: string, type?: number }) => {
	const dims = size === "sm" ? "w-8 h-10" : size === "lg" ? "w-20 h-24" : "w-12 h-16";
	
    // Ensure colors are valid hex
    const p = primary || "#333333";
    const s = secondary || "#ffffff";
    
    // Deterministic logo type selection
    let logoType = 0;
    if (type !== undefined) {
        logoType = type;
    } else {
        const hash = name ? getHash(name) : getHash(p + s);
        logoType = hash % 5; // 5 types
    }

	return (
		<svg viewBox="0 0 100 120" className={`${dims} drop-shadow-sm`}>
			<defs>
				<clipPath id="shieldClip">
					<path d="M50 0 L100 20 L100 60 C100 90 75 110 50 120 C25 110 0 90 0 60 L0 20 Z" />
				</clipPath>
                <clipPath id="circleClip">
                    <circle cx="50" cy="50" r="50" />
                </clipPath>
				<linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor="white" stopOpacity="0.3" />
					<stop offset="50%" stopColor="white" stopOpacity="0" />
					<stop offset="100%" stopColor="black" stopOpacity="0.1" />
				</linearGradient>
			</defs>

            {/* Render based on type */}
            {logoType === 4 ? (
                // Round Badge
                <g clipPath="url(#circleClip)" transform="translate(0, 10)">
                    <CircleBadge p={p} s={s} />
                    <rect width="100" height="120" fill="url(#shine)" />
                </g>
            ) : (
                // Shield Types
                <g clipPath="url(#shieldClip)">
                    {logoType === 0 && <ShieldStripes p={p} s={s} />}
                    {logoType === 1 && <ShieldHalves p={p} s={s} />}
                    {logoType === 2 && <ShieldV p={p} s={s} />}
                    {logoType === 3 && <ShieldCross p={p} s={s} />}
                    <rect width="100" height="120" fill="url(#shine)" />
                </g>
            )}
            
            {/* Outline - only for shields */}
            {logoType !== 4 && (
                <path 
                    d="M50 0 L100 20 L100 60 C100 90 75 110 50 120 C25 110 0 90 0 60 L0 20 Z" 
                    fill="none" 
                    stroke={s === p ? '#ffffff' : s} 
                    strokeWidth="4" 
                />
            )}
		</svg>
	);
};
