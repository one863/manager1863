"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NextMatchCard;
var lucide_preact_1 = require("lucide-preact");
var react_i18next_1 = require("react-i18next");
var ClubIdentityCard_1 = require("./ClubIdentityCard");
function NextMatchCard(_a) {
    var nextMatch = _a.nextMatch, userTeam = _a.userTeam, userRank = _a.userRank, onShowOpponent = _a.onShowOpponent, _b = _a.userForm, userForm = _b === void 0 ? [] : _b, _c = _a.opponentForm, opponentForm = _c === void 0 ? [] : _c, currentDay = _a.currentDay;
    var _d = (0, react_i18next_1.useTranslation)(), t = _d.t, i18n = _d.i18n;
    if (!nextMatch) {
        return (<div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
				<p className="text-xs font-bold uppercase tracking-widest text-gray-400">Aucun match prévu</p>
			</div>);
    }
    var match = nextMatch.match, opponent = nextMatch.opponent, opponentRank = nextMatch.opponentRank;
    var isHome = match.homeTeamId === (userTeam === null || userTeam === void 0 ? void 0 : userTeam.id);
    var daysUntil = match.day - currentDay;
    // Calcul du numéro de la journée (en supposant 1 match par semaine à partir du jour 6)
    // Jour 6 = Journée 1, Jour 13 = Journée 2, etc.
    var matchDayNumber = Math.floor((match.day - 6) / 7) + 1;
    // Helper pour récupérer les couleurs d'une équipe
    var getTeamColors = function (team) {
        if (!team)
            return { primary: "#3b82f6", secondary: "#ffffff" };
        return {
            primary: team.primaryColor || "#3b82f6",
            secondary: team.secondaryColor || "#ffffff"
        };
    };
    var FormPills = function (_a) {
        var matches = _a.matches, teamId = _a.teamId;
        return (<div className="flex gap-2 justify-center mt-3">
			{matches.map(function (m, i) {
                var isHome = m.homeTeamId === teamId;
                var score = isHome ? m.homeScore : m.awayScore;
                var oppScore = isHome ? m.awayScore : m.homeScore;
                var result = score > oppScore ? "W" : score === oppScore ? "D" : "L";
                var color = result === "W" ? "bg-green-500" : result === "D" ? "bg-gray-300" : "bg-red-500";
                return (<div key={i} className={"w-5 h-5 rounded-md ".concat(color, " shadow-sm flex items-center justify-center border border-white/50")} title={"".concat(m.homeScore, "-").concat(m.awayScore)}>
						<span className="text-[9px] font-black text-white">{result}</span>
					</div>);
            })}
			{matches.length === 0 && (<div className="flex gap-2">
					{[1, 2, 3, 4, 5].map(function (i) { return <div key={i} className="w-5 h-5 rounded-md bg-gray-100"/>; })}
				</div>)}
		</div>);
    };
    var opponentColors = getTeamColors(opponent);
    var userColors = getTeamColors(userTeam);
    var getRankSuffix = function (rank) {
        if (i18n.language.startsWith('fr')) {
            return rank === 1 ? "er" : "e";
        }
        if (rank === 1)
            return "st";
        if (rank === 2)
            return "nd";
        if (rank === 3)
            return "rd";
        return "th";
    };
    var renderRank = function (rank) {
        if (!rank)
            return null;
        return (<span className="text-[10px] text-gray-500 font-bold mt-1">
				{rank}<sup className="text-[8px]">{getRankSuffix(rank)}</sup>
			</span>);
    };
    return (<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
			{/* Header */}
			<div className="flex justify-between items-center mb-8">
				<div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
					<lucide_preact_1.Trophy size={14} className="text-accent"/>
					<span>Journée {matchDayNumber > 0 ? matchDayNumber : 1}</span>
				</div>
				<div className={"px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ".concat(daysUntil === 0 ? "bg-red-50 text-red-600 animate-pulse" : "bg-gray-50 text-gray-400")}>
					{daysUntil === 0 ? "JOUR DE MATCH" : "J-".concat(daysUntil)}
				</div>
			</div>

			{/* Matchup */}
			<div className="flex items-center justify-between gap-2">
				{/* User Team */}
				<div className="flex flex-col items-center w-[40%]">
					<div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 mb-3 shadow-sm">
						<ClubIdentityCard_1.TeamCrest primary={userColors.primary} secondary={userColors.secondary} size="sm"/>
					</div>
					<span className="text-[11px] font-black text-ink uppercase tracking-tight text-center leading-tight truncate w-full">{(userTeam === null || userTeam === void 0 ? void 0 : userTeam.name) || "Votre Club"}</span>
					{renderRank(userRank)}
					<FormPills matches={userForm} teamId={(userTeam === null || userTeam === void 0 ? void 0 : userTeam.id) || 0}/>
				</div>

				{/* VS */}
				<div className="flex flex-col items-center gap-1.5 px-2">
					<div className="text-[10px] font-black text-gray-300">VS</div>
				</div>

				{/* Opponent */}
				<div className="flex flex-col items-center w-[40%] cursor-pointer group" onClick={function () { return onShowOpponent && onShowOpponent(opponent.id); }}>
					<div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 mb-3 shadow-sm group-hover:border-accent/20 transition-colors">
						<ClubIdentityCard_1.TeamCrest primary={opponentColors.primary} secondary={opponentColors.secondary} size="sm"/>
					</div>
					<span className="text-[11px] font-black text-ink uppercase tracking-tight text-center leading-tight truncate w-full">{opponent.name}</span>
					{renderRank(opponentRank)}
					<FormPills matches={opponentForm} teamId={opponent.id}/>
				</div>
			</div>
		</div>);
}
