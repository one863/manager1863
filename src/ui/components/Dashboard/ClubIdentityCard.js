"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamCrest = void 0;
exports.getTeamColors = getTeamColors;
exports.default = ClubIdentityCard;
var lucide_preact_1 = require("lucide-preact");
// Preset colors for deterministic generation
var PRESET_COLORS = [
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
function getTeamColors(team) {
    if (!team)
        return { primary: "#3b82f6", secondary: "#ffffff" };
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
    var hash = 0;
    var str = team.name || "Team";
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    var index = Math.abs(hash) % PRESET_COLORS.length;
    return { primary: PRESET_COLORS[index][0], secondary: PRESET_COLORS[index][1] };
}
// Generate a deterministic hash number for a string
function getHash(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
}
// Different logo components
var ShieldStripes = function (_a) {
    var p = _a.p, s = _a.s;
    return (<g>
        <rect width="100" height="120" fill={p}/>
        <rect x="20" width="15" height="120" fill={s} fillOpacity="0.9"/>
        <rect x="52.5" width="15" height="120" fill={s} fillOpacity="0.9"/>
        <rect x="85" width="15" height="120" fill={s} fillOpacity="0.9"/>
        <circle cx="50" cy="50" r="15" fill={p} stroke={s} strokeWidth="2"/>
        <path d="M42 50 L58 50 M50 42 L50 58" stroke={s} strokeWidth="3" strokeLinecap="round"/>
    </g>);
};
var ShieldHalves = function (_a) {
    var p = _a.p, s = _a.s;
    return (<g>
        <rect width="50" height="120" fill={p}/>
        <rect x="50" width="50" height="120" fill={s}/>
        <circle cx="50" cy="50" r="20" fill="white" stroke={p} strokeWidth="2"/>
        <text x="50" y="55" fontSize="20" fontWeight="bold" fill={p} textAnchor="middle">FC</text>
    </g>);
};
var ShieldV = function (_a) {
    var p = _a.p, s = _a.s;
    return (<g>
        <rect width="100" height="120" fill={p}/>
        <path d="M0 0 L50 60 L100 0 L100 30 L50 90 L0 30 Z" fill={s}/>
    </g>);
};
var ShieldCross = function (_a) {
    var p = _a.p, s = _a.s;
    return (<g>
        <rect width="100" height="120" fill={p}/>
        <rect x="40" width="20" height="120" fill={s}/>
        <rect y="30" width="100" height="20" fill={s}/>
    </g>);
};
var CircleBadge = function (_a) {
    var p = _a.p, s = _a.s;
    return (<g>
        <circle cx="50" cy="50" r="48" fill={p} stroke={s} strokeWidth="4"/>
        <circle cx="50" cy="50" r="35" fill="none" stroke={s} strokeWidth="1"/>
        <path d="M50 15 L50 85 M15 50 L85 50" stroke={s} strokeWidth="2" opacity="0.5"/>
        <circle cx="50" cy="50" r="10" fill={s}/>
    </g>);
};
var TeamCrest = function (_a) {
    var primary = _a.primary, secondary = _a.secondary, _b = _a.size, size = _b === void 0 ? "md" : _b, name = _a.name;
    var dims = size === "sm" ? "w-8 h-10" : size === "lg" ? "w-20 h-24" : "w-12 h-16";
    // For circular logos, we might need a different aspect ratio container if we were strict, 
    // but w-8 h-10 works ok for shielding too.
    // Ensure colors are valid hex
    var p = primary || "#333333";
    var s = secondary || "#ffffff";
    // Deterministic logo type selection
    var hash = name ? getHash(name) : getHash(p + s);
    var type = hash % 5; // 5 types
    return (<svg viewBox="0 0 100 120" className={"".concat(dims, " drop-shadow-sm")}>
			<defs>
				<clipPath id="shieldClip">
					<path d="M50 0 L100 20 L100 60 C100 90 75 110 50 120 C25 110 0 90 0 60 L0 20 Z"/>
				</clipPath>
                <clipPath id="circleClip">
                    <circle cx="50" cy="50" r="50"/>
                </clipPath>
				<linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor="white" stopOpacity="0.3"/>
					<stop offset="50%" stopColor="white" stopOpacity="0"/>
					<stop offset="100%" stopColor="black" stopOpacity="0.1"/>
				</linearGradient>
			</defs>

            {/* Render based on type */}
            {type === 4 ? (
        // Round Badge
        <g clipPath="url(#circleClip)" transform="translate(0, 10)">
                    <CircleBadge p={p} s={s}/>
                    <rect width="100" height="120" fill="url(#shine)"/>
                </g>) : (
        // Shield Types
        <g clipPath="url(#shieldClip)">
                    {type === 0 && <ShieldStripes p={p} s={s}/>}
                    {type === 1 && <ShieldHalves p={p} s={s}/>}
                    {type === 2 && <ShieldV p={p} s={s}/>}
                    {type === 3 && <ShieldCross p={p} s={s}/>}
                    <rect width="100" height="120" fill="url(#shine)"/>
                </g>)}
            
            {/* Outline - only for shields */}
            {type !== 4 && (<path d="M50 0 L100 20 L100 60 C100 90 75 110 50 120 C25 110 0 90 0 60 L0 20 Z" fill="none" stroke={s === p ? '#ffffff' : s} strokeWidth="4"/>)}
		</svg>);
};
exports.TeamCrest = TeamCrest;
function ClubIdentityCard(_a) {
    var team = _a.team, league = _a.league, position = _a.position, coach = _a.coach;
    if (!team)
        return null;
    var _b = getTeamColors(team), primary = _b.primary, secondary = _b.secondary;
    return (<div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
			{/* Background Pattern */}
			<div className="absolute -top-10 -right-10 opacity-[0.03] text-slate-900 pointer-events-none">
				<lucide_preact_1.Shield size={240}/>
			</div>

			<div className="relative z-10 flex items-start gap-4">
				<div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm shrink-0">
					<exports.TeamCrest primary={primary} secondary={secondary} name={team.name}/>
				</div>

				<div className="flex-1 min-w-0 pt-1">
					<h2 className="text-xl font-black italic tracking-tighter text-ink truncate leading-none mb-2">
						{team.name}
					</h2>
					<div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
						<span className="flex items-center gap-1.5 text-slate-700">
							<lucide_preact_1.Trophy size={10} className="text-slate-400"/>
							{(league === null || league === void 0 ? void 0 : league.name) || "Ligue"}
						</span>
						<span className="opacity-30">•</span>
						<span className="flex items-center gap-1.5">
							<lucide_preact_1.Users size={10}/>
							Rep: {team.reputation}
						</span>
					</div>
				</div>
			</div>

			<div className="relative z-10 grid grid-cols-3 gap-3 mt-6">
				<div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
					<span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Classement</span>
					<div className="flex items-baseline gap-1">
						<span className="text-lg font-black text-ink">{position}</span>
						<span className="text-[10px] text-slate-400 font-black">E</span>
					</div>
				</div>

				<div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
					<span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Budget</span>
					<div className="flex items-baseline gap-1">
						<span className="text-lg font-black text-ink">{team.budget > 1000 ? "".concat((team.budget / 1000).toFixed(1), "M") : "".concat(team.budget, "k")}</span>
					</div>
				</div>

				<div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
					<span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Confiance</span>
					<div className="flex items-baseline gap-1">
						<span className={"text-lg font-black ".concat(team.confidence > 50 ? "text-green-600" : "text-amber-500")}>{team.confidence}</span>
						<span className="text-[10px] text-slate-400 font-black">%</span>
					</div>
				</div>
			</div>
		</div>);
}
