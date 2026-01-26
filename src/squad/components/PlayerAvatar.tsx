import { h } from "preact";
import { memo } from "preact/compat";
import { useMemo } from "preact/hooks";

interface PlayerAvatarProps {
	dna: string;
	size?: number;
	className?: string;
	onClick?: () => void;
	isStaff?: boolean;
	jerseyNumber?: number;
	teamColors?: [string, string]; // [primary, secondary]
}

const PlayerAvatar = memo(
	({ dna, size = 64, className = "", onClick, isStaff = false, jerseyNumber, teamColors }: PlayerAvatarProps) => {
		const {
			skin,
			hair,
			facialIdx,
			hairIdx,
			eyesIdx,
			gender,
			primaryColor,
			secondaryColor,
			hasBeard,
			beardStyle,
			hasTattoo,
			hasHeadband,
			headbandColor,
			hasBuzz,
		} = useMemo(() => {
			const parts = (dna || "0-0-0-0-0").split("-");
			while (parts.length < 5) parts.push("0");

			const [skinIdx, hIdx, fIdx, eIdx, gIdx] = parts.map(n => Number.parseInt(n, 10) || 0);
			const isFemale = gIdx % 2 === 1;

			// Palettes de peau réalistes
			const skins = ["#ffdbac", "#f5c5a3", "#e0ac69", "#c68642", "#8d5524", "#6b4423"];
			
			// Cheveux footballeurs (+ chauve, buzz cut)
			const hairColors = isStaff
				? ["#6b6b6b", "#a0a0a0", "#c0c0c0", "#8d8d8d", "#e0e0e0", "#4b3621"]
				: ["#1a1a1a", "#2c1e14", "#4b3621", "#8b4513", "#d4a574", "#e8c07d", "#c41e3a", "#00bfff"];

			// Couleurs maillot - utilise teamColors si fourni
			const defaultPrimary = ["#dc2626", "#2563eb", "#16a34a", "#facc15", "#7c3aed", "#000000", "#ffffff", "#ea580c"];
			const defaultSecondary = ["#ffffff", "#fbbf24", "#ffffff", "#000000", "#fbbf24", "#dc2626", "#2563eb", "#000000"];

			const colorIdx = (skinIdx + hIdx) % defaultPrimary.length;
			
			return {
				skin: skins[skinIdx % skins.length],
				hair: hairColors[hIdx % hairColors.length],
				facialIdx: fIdx % 6,
				hairIdx: hIdx % 8,
				eyesIdx: eIdx % 4,
				gender: isFemale ? "F" : "M",
				primaryColor: teamColors?.[0] || defaultPrimary[colorIdx],
				secondaryColor: teamColors?.[1] || defaultSecondary[colorIdx],
				hasBeard: !isFemale && !isStaff && fIdx % 3 !== 0,
				beardStyle: fIdx % 5,
				hasTattoo: !isStaff && (hIdx + eIdx) % 8 === 0,
				hasHeadband: !isStaff && hIdx % 7 === 2,
				headbandColor: ["#1a1a1a", "#ffffff", "#dc2626", "#2563eb"][(hIdx + fIdx) % 4],
				hasBuzz: hIdx % 8 >= 6, // Buzz cut ou chauve
			};
		}, [dna, isStaff, teamColors]);

		const headWidth = gender === "F" ? 30 : 33;
		const headHeight = gender === "F" ? 34 : 38;

		return (
			<svg
				width={size}
				height={size}
				viewBox="0 0 100 100"
				className={`rounded-xl bg-gradient-to-b from-slate-100 to-slate-200 border border-slate-300 shadow-sm transition-transform active:scale-95 ${className}`}
				xmlns="http://www.w3.org/2000/svg"
				onClick={onClick}
			>
				<defs>
					{/* Ombre portée */}
					<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
						<feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
					</filter>
					{/* Dégradé maillot */}
					<linearGradient id={`jersey-${dna}`} x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stopColor={primaryColor} />
						<stop offset="100%" stopColor={primaryColor} stopOpacity="0.85" />
					</linearGradient>
				</defs>

				{/* CORPS / MAILLOT */}
				{isStaff ? (
					<g filter="url(#shadow)">
						{/* Costume staff */}
						<path d="M 10 100 Q 10 72 50 72 Q 90 72 90 100 Z" fill="#374151" />
						{/* Chemise */}
						<path d="M 40 72 L 50 90 L 60 72 Z" fill="#f9fafb" />
						{/* Cravate */}
						<path d="M 48 74 L 52 74 L 50 92 Z" fill={primaryColor} />
						{/* Revers */}
						<path d="M 40 72 L 28 100" stroke="#1f2937" strokeWidth="1.5" fill="none" />
						<path d="M 60 72 L 72 100" stroke="#1f2937" strokeWidth="1.5" fill="none" />
					</g>
				) : (
					<g filter="url(#shadow)">
						{/* Maillot football */}
						<path d="M 8 100 Q 8 70 50 70 Q 92 70 92 100 Z" fill={`url(#jersey-${dna})`} />
						
						{/* Col en V ou rond selon DNA */}
						{hairIdx % 2 === 0 ? (
							<path d="M 38 70 L 50 82 L 62 70" fill="none" stroke={secondaryColor} strokeWidth="3" />
						) : (
							<ellipse cx="50" cy="72" rx="10" ry="4" fill="none" stroke={secondaryColor} strokeWidth="2.5" />
						)}
						
						{/* Bandes épaules (style moderne) */}
						{facialIdx % 3 === 0 && (
							<>
								<path d="M 12 74 Q 18 78 20 100" fill="none" stroke={secondaryColor} strokeWidth="3" />
								<path d="M 88 74 Q 82 78 80 100" fill="none" stroke={secondaryColor} strokeWidth="3" />
							</>
						)}
						
						{/* Sponsor/Badge zone */}
						<rect x="35" y="82" width="30" height="8" rx="1" fill="rgba(255,255,255,0.15)" />
						
						{/* Numéro de maillot si fourni */}
						{jerseyNumber && (
							<text x="50" y="97" textAnchor="middle" fontSize="14" fontWeight="bold" fill={secondaryColor} fontFamily="sans-serif">
								{jerseyNumber}
							</text>
						)}
					</g>
				)}

				{/* COU */}
				<rect x="43" y="60" width="14" height="14" rx="2" fill={skin} />
				
				{/* Tatouage cou */}
				{hasTattoo && (
					<g opacity="0.3">
						<path d="M 44 62 L 46 68 L 44 74" stroke="#1a1a1a" strokeWidth="1" fill="none" />
						<path d="M 56 62 L 54 68 L 56 74" stroke="#1a1a1a" strokeWidth="1" fill="none" />
					</g>
				)}

				{/* TÊTE */}
				<ellipse cx="50" cy="42" rx={headWidth} ry={headHeight} fill={skin} filter="url(#shadow)" />

				{/* BARBE */}
				{hasBeard && gender === "M" && (
					<g opacity="0.5" fill={hair}>
						{beardStyle === 0 && (
							// Barbe courte (stubble)
							<ellipse cx="50" cy="58" rx="18" ry="12" opacity="0.3" />
						)}
						{beardStyle === 1 && (
							// Bouc
							<path d="M 44 60 Q 50 72 56 60 Q 50 66 44 60" />
						)}
						{beardStyle === 2 && (
							// Barbe pleine
							<path d="M 22 48 Q 22 75 50 80 Q 78 75 78 48 Q 70 65 50 68 Q 30 65 22 48" />
						)}
						{beardStyle === 3 && (
							// Moustache + bouc
							<>
								<path d="M 38 54 Q 50 58 62 54 Q 50 60 38 54" />
								<path d="M 46 60 Q 50 70 54 60 Q 50 66 46 60" />
							</>
						)}
						{beardStyle === 4 && (
							// Barbe style hipster
							<path d="M 25 50 Q 25 78 50 82 Q 75 78 75 50 Q 68 70 50 74 Q 32 70 25 50" />
						)}
					</g>
				)}

				{/* Rides staff */}
				{isStaff && (
					<g stroke="#000" opacity="0.08" fill="none" strokeWidth="1">
						<path d="M 30 28 Q 50 25 70 28" />
						<path d="M 28 36 Q 32 34 36 36" />
						<path d="M 64 36 Q 68 34 72 36" />
					</g>
				)}

				{/* CHEVEUX */}
				<g fill={hair}>
					{hasBuzz ? (
						// Buzz cut ou chauve
						hairIdx % 8 === 6 ? (
							<path d="M 17 38 Q 17 8 50 8 Q 83 8 83 38 Q 50 32 17 38" opacity="0.4" />
						) : (
							// Chauve - juste reflet
							<ellipse cx="50" cy="15" rx="15" ry="8" fill="white" opacity="0.15" />
						)
					) : gender === "F" ? (
						<>
							{hairIdx % 3 === 0 && <path d="M 15 42 Q 15 5 50 5 Q 85 5 85 42 L 88 85 Q 50 78 12 85 Z" />}
							{hairIdx % 3 === 1 && (
								<>
									<path d="M 18 40 Q 18 8 50 8 Q 82 8 82 40 Q 50 30 18 40" />
									<path d="M 80 20 Q 98 15 92 55 Q 86 65 80 38" />
								</>
							)}
							{hairIdx % 3 === 2 && <path d="M 15 42 Q 15 6 50 5 Q 85 6 85 38 L 78 32 Q 50 18 22 32 Z" />}
						</>
					) : (
						<>
							{hairIdx === 0 && (
								<>
									<path d="M 17 42 Q 17 5 50 5 Q 83 5 83 42 Q 50 32 17 42" />
									<path d="M 20 44 Q 50 34 80 44 L 76 38 Q 50 28 24 38 Z" opacity="0.5" />
								</>
							)}
							{hairIdx === 1 && <path d="M 17 45 Q 25 2 50 0 Q 75 2 83 45 Q 65 28 50 30 Q 35 28 17 45" />}
							{hairIdx === 2 && (
								<>
									<path d="M 17 42 Q 20 5 50 5 Q 80 5 83 42 Q 50 32 17 42" />
									<circle cx="50" cy="5" r="7" />
								</>
							)}
							{hairIdx === 3 && <path d="M 22 42 Q 22 28 40 12 L 50 -2 L 60 12 Q 78 28 78 42 Q 50 36 22 42" />}
							{hairIdx === 4 && <path d="M 17 45 Q 20 5 50 5 Q 80 5 83 45 Q 50 38 17 45" />}
							{hairIdx === 5 && <path d="M 17 45 Q 17 5 60 3 Q 88 5 83 45 Q 50 35 17 45" />}
						</>
					)}
				</g>

				{/* BANDEAU */}
				{hasHeadband && !hasBuzz && (
					<path 
						d="M 18 32 Q 50 26 82 32" 
						fill="none" 
						stroke={headbandColor} 
						strokeWidth="4" 
						strokeLinecap="round"
					/>
				)}

				{/* VISAGE */}
				<g>
					{/* Sourcils */}
					<path d="M 28 32 Q 35 30 40 33" stroke={hair} strokeWidth="2" fill="none" opacity="0.6" />
					<path d="M 60 33 Q 65 30 72 32" stroke={hair} strokeWidth="2" fill="none" opacity="0.6" />
					
					{/* Yeux */}
					<ellipse cx="35" cy="40" rx="5" ry="4" fill="white" />
					<circle cx="35" cy="40" r="2.5" fill="#2d1b0e" />
					<circle cx="34" cy="39" r="1" fill="white" />
					
					<ellipse cx="65" cy="40" rx="5" ry="4" fill="white" />
					<circle cx="65" cy="40" r="2.5" fill="#2d1b0e" />
					<circle cx="64" cy="39" r="1" fill="white" />
					
					{/* Nez */}
					<path d="M 48 50 Q 50 56 52 50" stroke="rgba(0,0,0,0.15)" fill="none" strokeWidth="1.5" />
					
					{/* Bouche */}
					<path d="M 42 62 Q 50 67 58 62" stroke="rgba(0,0,0,0.25)" fill="none" strokeWidth="2" />
					
					{/* Oreilles */}
					<ellipse cx="17" cy="44" rx="4" ry="6" fill={skin} />
					<ellipse cx="83" cy="44" rx="4" ry="6" fill={skin} />
				</g>
			</svg>
		);
	},
);

export default PlayerAvatar;
