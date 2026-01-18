"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ClubDetails;
var db_1 = require("@/core/db/db");
var lucide_preact_1 = require("lucide-preact");
var hooks_1 = require("preact/hooks");
var react_i18next_1 = require("react-i18next");
var PlayerAvatar_1 = require("@/squad/components/PlayerAvatar");
var ClubIdentityCard_1 = require("@/ui/components/Dashboard/ClubIdentityCard");
function ClubDetails(_a) {
    var _this = this;
    var teamId = _a.teamId, onClose = _a.onClose, onSelectPlayer = _a.onSelectPlayer;
    var t = (0, react_i18next_1.useTranslation)().t;
    var _b = (0, hooks_1.useState)(null), team = _b[0], setTeam = _b[1];
    var _c = (0, hooks_1.useState)([]), players = _c[0], setPlayers = _c[1];
    var _d = (0, hooks_1.useState)(null), coach = _d[0], setCoach = _d[1];
    var _e = (0, hooks_1.useState)("info"), activeTab = _e[0], setActiveTab = _e[1];
    (0, hooks_1.useEffect)(function () {
        var loadData = function () { return __awaiter(_this, void 0, void 0, function () {
            var t, p, staff;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!teamId)
                            return [2 /*return*/];
                        return [4 /*yield*/, db_1.db.teams.get(teamId)];
                    case 1:
                        t = _a.sent();
                        setTeam(t || null);
                        return [4 /*yield*/, db_1.db.players.where("teamId").equals(teamId).toArray()];
                    case 2:
                        p = _a.sent();
                        setPlayers(p.sort(function (a, b) { return b.skill - a.skill; }));
                        return [4 /*yield*/, db_1.db.staff
                                .where("teamId")
                                .equals(teamId)
                                .and(function (s) { return s.role === "COACH"; })
                                .first()];
                    case 3:
                        staff = _a.sent();
                        setCoach(staff || null);
                        return [2 /*return*/];
                }
            });
        }); };
        loadData();
    }, [teamId]);
    if (!team)
        return null;
    var _f = (0, ClubIdentityCard_1.getTeamColors)(team), primary = _f.primary, secondary = _f.secondary;
    return (<div className="flex flex-col h-full bg-white animate-fade-in">
			{/* HEADER - Reordered Logo & Name to top */}
			<div className="bg-white p-4 pt-6 sticky top-0 z-10 border-b border-gray-100">
				<div className="flex items-start justify-between mb-4">
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-ink hover:bg-gray-100 transition-all">
                        <lucide_preact_1.ArrowLeft size={20}/>
                    </button>
                    
                    <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm shrink-0">
						<ClubIdentityCard_1.TeamCrest primary={primary} secondary={secondary}/>
					</div>
                </div>

				<div className="min-w-0 text-center">
                    <h2 className="text-3xl font-black italic tracking-tighter text-ink truncate leading-none">
                        {team.name}
                    </h2>
                    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-ink-light uppercase tracking-tight">
                            <lucide_preact_1.MapPin size={12} className="text-accent"/> 
                            {team.stadiumName}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-ink-light uppercase tracking-tight">
                            <lucide_preact_1.Users size={12} className="text-accent"/> 
                            {team.stadiumCapacity.toLocaleString()}
                        </div>
                    </div>
                </div>
			</div>

			{/* TABS - Swapped order */}
			<div className="flex bg-white px-2">
				<button onClick={function () { return setActiveTab("info"); }} className={"flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ".concat(activeTab === "info" ? "text-accent border-b-2 border-accent" : "text-gray-300 hover:text-gray-500")}>
					Informations
				</button>
				<button onClick={function () { return setActiveTab("squad"); }} className={"flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ".concat(activeTab === "squad" ? "text-accent border-b-2 border-accent" : "text-gray-300 hover:text-gray-500")}>
					Effectif
				</button>
			</div>

			{/* CONTENT */}
			<div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
				{activeTab === "squad" ? (<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 p-3 bg-gray-50 border-b border-gray-100 text-[9px] font-black uppercase text-gray-400">
                            <div className="w-10 text-center">Pos</div>
                            <div>Nom</div>
                            <div className="w-8 text-center">Age</div>
                            <div className="w-8 text-center">Niv</div>
                        </div>

                        <div className="divide-y divide-gray-50">
                            {players.map(function (player) { return (<div key={player.id} onClick={function () { return onSelectPlayer && onSelectPlayer(player); }} className="grid grid-cols-[auto_1fr_auto_auto] gap-2 p-3 items-center hover:bg-gray-50 transition-colors cursor-pointer">
                                    <div className="w-10 flex justify-center">
                                        <span className={"px-1.5 py-0.5 rounded text-[9px] font-black border ".concat(player.position === "GK" ? "bg-yellow-50 text-yellow-700 border-yellow-100" :
                    player.position === "DEF" ? "bg-blue-50 text-blue-700 border-blue-100" :
                        player.position === "MID" ? "bg-green-50 text-green-700 border-green-100" :
                            "bg-red-50 text-red-700 border-red-100")}>
                                            {player.position}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 min-w-0">
                                        <PlayerAvatar_1.default dna={player.dna} size={32}/>
                                        <div className="truncate">
                                            <p className="font-bold text-ink text-sm truncate">{player.lastName}</p>
                                            <p className="text-[9px] text-gray-400 truncate">{player.firstName}</p>
                                        </div>
                                    </div>
                                    <div className="w-8 text-center text-xs font-mono text-gray-500">
                                        {player.age}
                                    </div>
                                    <div className="w-8 text-center">
                                        <span className={"font-black font-mono text-sm ".concat(player.skill >= 16 ? "text-amber-500" :
                    player.skill >= 12 ? "text-green-600" : "text-gray-400")}>
                                            {Math.floor(player.skill)}
                                        </span>
                                    </div>
                                </div>); })}
                        </div>
                    </div>) : (<div className="space-y-4">
						<div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
							<h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4">Direction Sportive</h3>
							<div className="flex items-center gap-4">
								<div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center border border-gray-100">
                                    {coach ? (<PlayerAvatar_1.default dna={coach.dna} size={48} isStaff/>) : (<lucide_preact_1.Users size={20} className="text-accent"/>)}
								</div>
								<div>
									<p className="font-bold text-ink text-base">
                                        {coach ? "".concat(coach.firstName, " ").concat(coach.lastName) : "Poste Vacant"}
                                    </p>
									<p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Entraîneur Principal</p>
								</div>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
								<span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] block mb-2">Budget</span>
								<div className="flex items-center gap-2">
									<div className="p-1.5 bg-green-50 rounded-lg">
										<lucide_preact_1.Wallet size={16} className="text-green-600"/>
									</div>
									<p className="text-xl font-black text-ink">
										{team.budget > 1000 ? "".concat((team.budget / 1000).toFixed(1), "M") : "".concat(team.budget, "k")}
									</p>
								</div>
							</div>
							<div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
								<span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] block mb-2">Réputation</span>
								<div className="flex items-center gap-2">
									<div className="p-1.5 bg-amber-50 rounded-lg">
										<lucide_preact_1.Trophy size={16} className="text-amber-500"/>
									</div>
									<p className="text-xl font-black text-ink">
										{team.reputation}
									</p>
								</div>
							</div>
						</div>
					</div>)}
			</div>
		</div>);
}
