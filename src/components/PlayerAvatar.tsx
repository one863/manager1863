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
	({ dna, size = 48, className = "", onClick, isStaff = false }: PlayerAvatarProps) => {
		// Parsing du DNA : "skin-hair-facial-eyes-gender"
		const { skin, hair, facialIdx, hairIdx, eyesIdx, gender } = useMemo(() => {
			const parts = dna ? dna.split("-") : ["0", "0", "0", "0", "0"];
			const [skinIdx, hIdx, fIdx, eIdx, gIdx] = parts.map(
				(n) => Number.parseInt(n, 10) || 0,
			);

			// gIdx % 2 == 0: Male, 1: Female
			const isFemale = gIdx % 2 === 1;

			// Palettes de couleurs
			const skins = ["#f8d5c2", "#e0ac69", "#8d5524", "#c68642"];
			
			const hairColors = isStaff 
				? ["#6b6b6b", "#a0a0a0", "#d0d0d0", "#8d8d8d", "#ffffff", "#4b3020"]
				: ["#4b3020", "#2c1e14", "#d6b67d", "#913312", "#000000", "#6b6b6b"];

			return {
				skin: skins[skinIdx % skins.length],
				hair: hairColors[hIdx % hairColors.length],
				facialIdx: isFemale ? 0 : (isStaff ? (fIdx % 3) + 2 : fIdx),
				hairIdx: hIdx,
				eyesIdx: eIdx,
				gender: isFemale ? "F" : "M"
			};
		}, [dna, isStaff]);

		return (
			<svg
				width={size}
				height={size}
				viewBox="0 0 100 100"
				className={`rounded-full bg-paper-dark border border-gray-300 ${className}`}
				xmlns="http://www.w3.org/2000/svg"
				onClick={onClick}
			>
				{/* Cou */}
				<rect x="40" y="75" width="20" height="15" fill={skin} />

				{/* Visage (Ovale légèrement plus bas) */}
				<ellipse cx="50" cy="50" rx="35" ry="40" fill={skin} />

				{/* Rides (Spécifique Staff/Anciens) - Positionnées par rapport au nouveau centre */}
				{isStaff && (
					<g stroke="black" opacity="0.1" fill="none" strokeWidth="1">
						<path d="M 30 38 Q 35 35 40 38" />
						<path d="M 60 38 Q 65 35 70 38" />
						<path d="M 40 32 Q 50 30 60 32" />
						<path d="M 30 58 Q 35 60 40 58" />
						<path d="M 60 58 Q 65 60 70 58" />
					</g>
				)}

				{/* Yeux (Position fixe et dégagée) */}
				<g>
					<circle cx="35" cy="46" r="4" fill="white" />
					<circle cx="35" cy="46" r="2" fill="#333" />
					<circle cx="65" cy="46" r="4" fill="white" />
					<circle cx="65" cy="46" r="2" fill="#333" />
				</g>

				{/* Nez */}
				<path
					d="M 48 52 Q 50 58 52 52"
					stroke="#333"
					fill="none"
					strokeWidth="1"
				/>

				{/* Bouche */}
				<path
					d="M 42 70 Q 50 75 58 70"
					stroke="#333"
					fill="none"
					strokeWidth="1.5"
				/>

				{/* Pilosité faciale (Hommes uniquement) */}
				{facialIdx > 0 && gender === "M" && (
					<g fill={hair} opacity="0.9">
						{facialIdx === 1 && (
							<path d="M 35 64 Q 50 68 65 64 Q 50 71 35 64" />
						)}
						{facialIdx === 2 && (
							<path d="M 30 62 Q 50 75 70 62 Q 50 82 30 62" />
						)}
						{facialIdx === 3 && (
							<path d="M 25 55 Q 50 95 75 55 L 70 50 Q 50 85 30 50 Z" />
						)}
						{facialIdx === 4 && (
							<g>
								<path d="M 18 45 Q 22 65 32 75" stroke={hair} strokeWidth="6" fill="none" />
								<path d="M 82 45 Q 78 65 68 75" stroke={hair} strokeWidth="6" fill="none" />
							</g>
						)}
					</g>
				)}

				{/* Cheveux (Redessinés pour éviter l'effet visière et bien couvrir le crâne) */}
				<g fill={hair}>
					{/* Style Féminin spécifique si hairIdx élevé */}
					{gender === "F" ? (
						<g>
							{hairIdx % 3 === 0 && (
								<path d="M 15 50 Q 15 10 50 10 Q 85 10 85 50 Q 95 70 85 80 Q 50 70 15 80 Q 5 70 15 50" />
							)}
							{hairIdx % 3 === 1 && (
								<g>
									<path d="M 15 50 Q 50 5 85 50 Q 85 25 50 25 Q 15 25 15 50" />
									<circle cx="85" cy="50" r="10" />
									<circle cx="15" cy="50" r="10" />
								</g>
							)}
							{hairIdx % 3 === 2 && (
								<path d="M 15 50 Q 50 15 85 50 L 90 90 Q 50 80 10 90 Z" />
							)}
						</g>
					) : (
						<g>
							{hairIdx % 6 === 0 && <path d="M 15 45 Q 50 5 85 45 Q 50 25 15 45" />}
							{hairIdx % 6 === 1 && <path d="M 15 50 Q 50 0 85 50 Q 70 30 50 25 Q 30 30 15 50" />}
							{hairIdx % 6 === 2 && <path d="M 10 55 Q 50 10 90 55 Q 95 65 85 45 Q 50 30 15 45 Q 5 65 10 55" />}
							{hairIdx % 6 === 3 && <path d="M 15 45 Q 50 20 85 45 L 90 40 Q 50 10 10 40 Z" />}
							{hairIdx % 6 === 4 && <path d="M 15 50 Q 20 40 30 35 Q 50 30 70 35 Q 80 40 85 50 L 80 55 Q 50 45 20 55 Z" />}
							{hairIdx % 6 === 5 && <path d="M 15 50 Q 15 20 50 20 Q 85 20 85 50 Q 80 40 50 35 Q 20 40 15 50" />}
						</g>
					)}
				</g>
			</svg>
		);
	},
);

export default PlayerAvatar;
