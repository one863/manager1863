import { h } from "preact";
import { memo } from "preact/compat";
import { useMemo } from "preact/hooks";

interface PlayerAvatarProps {
	dna: string;
	size?: number;
	className?: string;
	onClick?: () => void;
	isStaff?: boolean;
}

const PlayerAvatar = memo(
	({ dna, size = 64, className = "", onClick, isStaff = false }: PlayerAvatarProps) => {
		const {
			skin,
			hair,
			facialIdx,
			hairIdx,
			eyesIdx,
			gender,
			jerseyColor,
			hasEarring,
			hasHeadband,
		} = useMemo(() => {
			// Parsing du DNA : "skin-hair-facial-eyes-gender"
			const parts = (dna || "0-0-0-0-0").split("-");
			
			// Complétion du DNA si nécessaire
			while (parts.length < 5) {
				parts.push("0");
			}

			const [skinIdx, hIdx, fIdx, eIdx, gIdx] = parts.map(
				(n) => Number.parseInt(n, 10) || 0,
			);

			const isFemale = gIdx % 2 === 1;

			// Palettes
			const skins = ["#f8d5c2", "#e0ac69", "#8d5524", "#c68642"];
			
			// Colorer les cheveux différemment pour le staff (plus de poivre et sel / blanc)
			const hairColors = isStaff
				? ["#6b6b6b", "#a0a0a0", "#d0d0d0", "#8d8d8d", "#ffffff", "#4b3020"]
				: ["#4b3020", "#2c1e14", "#d6b67d", "#913312", "#222222", "#c29a5b"];

			const jerseyColors = ["#2563eb", "#dc2626", "#facc15", "#16a34a", "#7c3aed", "#ea580c", "#ffffff", "#000000"];

			return {
				skin: skins[skinIdx % skins.length],
				hair: hairColors[hIdx % hairColors.length],
				facialIdx: isFemale ? 0 : fIdx % 5,
				hairIdx: hIdx % 6,
				eyesIdx: eIdx % 4,
				gender: isFemale ? "F" : "M",
				jerseyColor: jerseyColors[(skinIdx + hIdx + eIdx) % jerseyColors.length],
				hasEarring: !isStaff && (hIdx + eIdx) % 7 === 0,
				hasHeadband: !isStaff && hIdx % 6 === 2,
			};
		}, [dna, isStaff]);

		// Tailles de tête fixes par genre
		const headWidth = gender === "F" ? 32 : 35;
		const headHeight = gender === "F" ? 36 : 40;

		return (
			<svg
				width={size}
				height={size}
				viewBox="0 0 100 100"
				className={`rounded-xl bg-paper-dark border-2 border-gray-300 shadow-sm transition-transform active:scale-95 ${className}`}
				xmlns="http://www.w3.org/2000/svg"
				onClick={onClick}
			>
				{/* Fond avec dégradé subtil */}
				<defs>
					<linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" style="stop-color:rgba(255,255,255,0.05);stop-opacity:1" />
						<stop offset="100%" style="stop-color:rgba(0,0,0,0.05);stop-opacity:1" />
					</linearGradient>
				</defs>
				<rect width="100" height="100" fill="url(#bgGrad)" />

				{/* Tenue (Maillot ou Costume) */}
				<g>
					{isStaff ? (
						<g>
							{/* Veste de costume (Gris anthracite) */}
							<path d="M 5 100 Q 5 78 50 78 Q 95 78 95 100 Z" fill="#2d3748" />
							{/* Chemise blanche */}
							<path d="M 38 78 L 50 96 L 62 78 Z" fill="#ffffff" />
							{/* Cravate aux couleurs du club */}
							<path d="M 47 78 L 53 78 L 50 94 Z" fill={jerseyColor} />
							{/* Revers de la veste */}
							<path d="M 38 78 L 25 100 M 62 78 L 75 100" stroke="#1a202c" strokeWidth="2" />
						</g>
					) : (
						<g>
							{/* Maillot de foot moderne */}
							<path d="M 5 100 Q 5 78 50 78 Q 95 78 95 100 Z" fill={jerseyColor} />
							{/* Détail col (Alternance selon DNA) */}
							{hairIdx % 2 === 0 ? (
								<path d="M 40 78 L 50 90 L 60 78" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
							) : (
								<path d="M 40 78 Q 50 88 60 78" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="2.5" />
							)}
							{/* Logo Club (Badge) */}
							<circle cx="72" cy="88" r="3" fill="white" opacity="0.6" />
						</g>
					)}
				</g>

				{/* Cou */}
				<rect x="42" y="65" width="16" height="15" fill={skin} />

				{/* Visage (Taille fixe selon genre) */}
				<ellipse cx="50" cy="48" rx={headWidth} ry={headHeight} fill={skin} />

				{/* Barbe (Hommes uniquement, sous les traits) */}
				{gender === "M" && facialIdx > 0 && (
					<g opacity="0.4" fill={hair}>
						{facialIdx === 1 && <path d="M 25 55 Q 25 82 50 86 Q 75 82 75 55 Q 70 78 50 78 Q 30 78 25 55" />}
						{facialIdx === 2 && (
							<g>
								<path d="M 38 78 Q 50 85 62 78 Q 50 90 38 78" />
								<path d="M 44 66 Q 50 69 56 66 L 56 68 Q 50 72 44 68 Z" />
							</g>
						)}
						{facialIdx === 3 && <path d="M 22 48 Q 22 88 50 92 Q 78 88 78 48 L 74 48 Q 74 80 50 84 Q 26 80 26 48 Z" opacity="0.7" />}
						{facialIdx === 4 && <path d="M 30 74 Q 50 88 70 74 Q 50 80 30 74" />}
					</g>
				)}

				{/* Rides Staff */}
				{isStaff && (
					<g stroke="black" opacity="0.1" fill="none" strokeWidth="1.2">
						<path d="M 32 35 Q 50 33 68 35" />
						<path d="M 30 42 Q 35 40 40 42" />
						<path d="M 60 42 Q 65 40 70 42" />
					</g>
				)}

				{/* CHEVEUX (Placés avant les traits pour un rendu propre) */}
				<g fill={hair}>
					{gender === "F" ? (
						<g>
							{hairIdx % 3 === 0 && <path d="M 15 45 Q 15 10 50 10 Q 85 10 85 45 L 88 80 Q 50 75 12 80 Z" />}
							{hairIdx % 3 === 1 && (
								<g>
									<path d="M 18 45 Q 18 15 50 15 Q 82 15 82 45 Q 50 35 18 45" />
									<path d="M 80 25 Q 100 18 94 55 Q 88 65 80 40" />
								</g>
							)}
							{hairIdx % 3 === 2 && <path d="M 15 45 Q 15 12 50 10 Q 85 12 85 40 L 78 35 Q 50 22 22 35 Z" />}
						</g>
					) : (
						<g>
							{hairIdx === 0 && (
								<g>
									<path d="M 15 45 Q 15 8 50 8 Q 85 8 85 45 Q 50 35 15 45" />
									<path d="M 20 48 Q 50 38 80 48 L 76 42 Q 50 32 24 42 Z" opacity="0.6" />
								</g>
							)}
							{hairIdx === 1 && <path d="M 15 48 Q 25 5 50 3 Q 75 5 85 48 Q 65 30 50 33 Q 35 30 15 48" />}
							{hairIdx === 2 && (
								<g>
									<path d="M 17 45 Q 20 10 50 10 Q 80 10 83 45 Q 50 35 17 45" />
									<circle cx="50" cy="8" r="8" />
									{hasHeadband && <path d="M 19 36 Q 50 32 81 36" fill="none" stroke="#222" strokeWidth="2.5" />}
								</g>
							)}
							{hairIdx === 3 && <path d="M 22 45 Q 22 30 40 15 L 50 0 L 60 15 Q 78 30 78 45 Q 50 40 22 45" />}
							{hairIdx === 4 && <path d="M 15 48 Q 20 10 50 10 Q 80 10 85 48 Q 50 40 15 48" opacity="0.9" />}
							{hairIdx === 5 && <path d="M 15 48 Q 15 8 60 6 Q 88 8 85 48 Q 50 35 15 48" />}
						</g>
					)}
				</g>

				{/* TRAITS DU VISAGE (Toujours au-dessus des cheveux) */}
				<g>
					{/* Yeux */}
					<g>
						<circle cx="34" cy="46" r="3.8" fill="white" />
						<circle cx="34" cy="46" r="1.8" fill="#333" />
						<circle cx="66" cy="46" r="3.8" fill="white" />
						<circle cx="66" cy="46" r="1.8" fill="#333" />
					</g>
					{/* Nez discret */}
					<path d="M 47 58 Q 50 63 53 58" stroke="rgba(0,0,0,0.2)" fill="none" strokeWidth="1.5" />
					{/* Bouche */}
					<path d="M 40 73 Q 50 78 60 73" stroke="rgba(0,0,0,0.3)" fill="none" strokeWidth="2.5" />
					{/* Boucle d'oreille (Joueurs uniquement) */}
					{hasEarring && (
						<circle cx="15" cy="55" r="1.8" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />
					)}
				</g>
			</svg>
		);
	},
);

export default PlayerAvatar;
