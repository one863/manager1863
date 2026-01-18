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
exports.default = CreateTeam;
var db_1 = require("@/core/db/db");
var world_generator_1 = require("@/core/generators/world-generator");
var gameSlice_1 = require("@/infrastructure/store/gameSlice");
var lucide_preact_1 = require("lucide-preact");
var hooks_1 = require("preact/hooks");
var react_i18next_1 = require("react-i18next");
var Button_1 = require("@/ui/components/Common/Button");
var TeamCrest_1 = require("@/ui/components/Common/TeamCrest");
var PRESET_COLORS = [
    "#ffffff", // White (Real Madrid, Spurs)
    "#000000", // Black (Juventus)
    "#da291c", // Red (Man Utd, Liverpool, Arsenal, Bayern)
    "#004d98", // Royal Blue (Barça, Everton)
    "#a50044", // Garnet (Barça)
    "#fde100", // Yellow (Dortmund, Brazil)
    "#6cabdd", // Sky Blue (Man City, Argentina)
    "#034694", // Chelsea Blue
    "#0068a8", // Inter Blue
    "#fb090b", // Milan Red
    "#004170", // PSG Dark Blue
    "#003a70", // Boca Blue
    "#fdb913", // Gold (Boca, Wolves)
    "#009b3a", // Green (Brazil, Celtic)
    "#ed1c24", // River Plate Red
    "#6366f1", // Indigo
    "#f97316", // Orange (Netherlands)
    "#a855f7", // Purple
    "#14b8a6", // Teal
    "#4b5563", // Slate
];
function CreateTeam(_a) {
    var _this = this;
    var onGameCreated = _a.onGameCreated, onCancel = _a.onCancel;
    var t = (0, react_i18next_1.useTranslation)().t;
    var _b = (0, hooks_1.useState)(""), managerFirstName = _b[0], setManagerFirstName = _b[1];
    var _c = (0, hooks_1.useState)(""), managerLastName = _c[0], setManagerLastName = _c[1];
    var _d = (0, hooks_1.useState)(""), teamName = _d[0], setTeamName = _d[1];
    var _e = (0, hooks_1.useState)(PRESET_COLORS[2]), primaryColor = _e[0], setPrimaryColor = _e[1]; // Default Red
    var _f = (0, hooks_1.useState)(PRESET_COLORS[0]), secondaryColor = _f[0], setSecondaryColor = _f[1]; // Default White
    var _g = (0, hooks_1.useState)(false), isGenerating = _g[0], setIsGenerating = _g[1];
    // On simule un nom pour changer le type de logo
    var _h = (0, hooks_1.useState)("type0"), logoSeed = _h[0], setLogoSeed = _h[1];
    var initializeGame = (0, gameSlice_1.useGameStore)(function (state) { return state.initialize; });
    var handleCreate = function () { return __awaiter(_this, void 0, void 0, function () {
        var managerName, saveId, userTeamId, logoType, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!managerFirstName.trim() || !managerLastName.trim() || !teamName.trim())
                        return [2 /*return*/];
                    setIsGenerating(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 7, , 8]);
                    managerName = "".concat(managerFirstName.trim(), " ").concat(managerLastName.trim());
                    return [4 /*yield*/, db_1.db.saveSlots.add({
                            managerName: managerName,
                            teamName: teamName,
                            lastPlayedDate: new Date(),
                            day: 1,
                            season: 1,
                        })];
                case 2:
                    saveId = _a.sent();
                    return [4 /*yield*/, (0, world_generator_1.generateWorld)(saveId, teamName)];
                case 3:
                    userTeamId = (_a.sent()).userTeamId;
                    logoType = parseInt(logoSeed.replace("type", "")) || 0;
                    return [4 /*yield*/, db_1.db.teams.update(userTeamId, {
                            primaryColor: primaryColor,
                            secondaryColor: secondaryColor,
                            colors: [primaryColor, secondaryColor],
                            // @ts-ignore - Adding extra prop
                            logoType: logoType
                        })];
                case 4:
                    _a.sent();
                    // 3. Initialize State
                    return [4 /*yield*/, db_1.db.gameState.add({
                            saveId: saveId,
                            currentDate: new Date("1863-09-01"),
                            season: 1,
                            day: 1,
                            userTeamId: userTeamId,
                            isGameOver: false,
                        })];
                case 5:
                    // 3. Initialize State
                    _a.sent();
                    return [4 /*yield*/, initializeGame(saveId, new Date("1863-09-01"), userTeamId, managerName, teamName)];
                case 6:
                    _a.sent();
                    onGameCreated();
                    return [3 /*break*/, 8];
                case 7:
                    e_1 = _a.sent();
                    console.error("Generation failed", e_1);
                    alert("Erreur lors de la création de la partie.");
                    setIsGenerating(false);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    }); };
    var currentLogoType = (0, hooks_1.useMemo)(function () {
        return parseInt(logoSeed.replace("type", "")) || 0;
    }, [logoSeed]);
    var rotateLogo = function () {
        var nextType = (currentLogoType + 1) % 5;
        setLogoSeed("type".concat(nextType));
    };
    var ColorPicker = function (_a) {
        var label = _a.label, selected = _a.selected, onChange = _a.onChange;
        return (<div className="space-y-2">
			<label className="text-[10px] font-black uppercase tracking-widest text-ink-light leading-none">{label}</label>
			<div className="grid grid-cols-10 gap-1.5">
				{PRESET_COLORS.map(function (c) { return (<button key={c} onClick={function () { return onChange(c); }} className={"w-6 h-6 rounded-md border transition-all ".concat(selected === c
                    ? "border-accent scale-110 shadow-sm z-10"
                    : "border-gray-100 hover:scale-110 hover:z-10")} style={{
                    backgroundColor: c,
                    boxShadow: selected === c ? "0 0 0 2px white, 0 0 0 4px ".concat(c) : 'none'
                }} title={c}/>); })}
			</div>
		</div>);
    };
    return (<div className="flex flex-col h-screen bg-white animate-fade-in w-full max-w-md mx-auto shadow-2xl relative overflow-hidden">
			{/* Top Decoration */}
			<div className="absolute top-[-20px] right-[-20px] opacity-[0.03] pointer-events-none">
				<lucide_preact_1.Shield size={240}/>
			</div>

			<div className="p-4 pt-6 flex-1 flex flex-col overflow-y-auto">
				<div className="flex items-center gap-4 mb-8 sticky top-0 bg-white/80 backdrop-blur-md z-20 py-2">
					<button onClick={onCancel} className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-ink-light hover:bg-gray-100 transition-colors shrink-0">
						<lucide_preact_1.ArrowLeft size={20}/>
					</button>
					
					<div>
						<h1 className="text-xl font-black italic tracking-tighter text-ink leading-none">
							Nouvelle Carrière
						</h1>
						<p className="text-ink-light text-[10px] font-serif italic mt-1 uppercase tracking-wider">
							Édition Fondatrice 1863
						</p>
					</div>
				</div>

				<div className="space-y-6 pb-6">
					{/* MANAGER NAMES */}
					<div className="flex gap-3">
						<div className="space-y-2 flex-1">
							<label className="block text-[10px] font-black uppercase tracking-widest text-ink-light ml-1">
								Prénom
							</label>
							<div className="relative group">
								<div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent transition-colors">
									<lucide_preact_1.User size={16}/>
								</div>
								<input type="text" value={managerFirstName} onChange={function (e) { return setManagerFirstName(e.target.value); }} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-9 pr-3 text-sm font-bold text-ink focus:border-accent focus:bg-white focus:outline-none transition-all placeholder:text-gray-300" placeholder="Prénom"/>
							</div>
						</div>

						<div className="space-y-2 flex-1">
							<label className="block text-[10px] font-black uppercase tracking-widest text-ink-light ml-1">
								Nom
							</label>
							<div className="relative group">
								<div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent transition-colors">
									<lucide_preact_1.User size={16}/>
								</div>
								<input type="text" value={managerLastName} onChange={function (e) { return setManagerLastName(e.target.value); }} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-9 pr-3 text-sm font-bold text-ink focus:border-accent focus:bg-white focus:outline-none transition-all placeholder:text-gray-300" placeholder="Nom"/>
							</div>
						</div>
					</div>

					{/* TEAM NAME */}
					<div className="space-y-2">
						<label className="block text-[10px] font-black uppercase tracking-widest text-ink-light ml-1">
							Votre Club
						</label>
						<div className="relative group">
							<div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent transition-colors">
								<lucide_preact_1.Shield size={16}/>
							</div>
							<input type="text" value={teamName} onChange={function (e) { return setTeamName(e.target.value); }} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-9 pr-3 text-sm font-bold text-ink focus:border-accent focus:bg-white focus:outline-none transition-all placeholder:text-gray-300" placeholder="Nom du Club"/>
						</div>
					</div>

					{/* COLORS & PREVIEW */}
					<div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-6">
						<div className="flex items-start gap-6">
							<div className="flex-1 space-y-6">
								<ColorPicker label="Couleur Principale" selected={primaryColor} onChange={setPrimaryColor}/>
								
								<ColorPicker label="Couleur Secondaire" selected={secondaryColor} onChange={setSecondaryColor}/>
							</div>

							<div className="flex flex-col items-center gap-2 pt-2">
								<div className="relative group">
                                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200/50">
                                        <TeamCrest_1.TeamCrest primary={primaryColor} secondary={secondaryColor} size="lg" 
    // @ts-ignore
    type={currentLogoType}/>
                                    </div>
                                    <button onClick={rotateLogo} className="absolute -bottom-2 -right-2 bg-white rounded-full p-1.5 shadow-md border border-gray-100 text-gray-400 hover:text-accent transition-colors" title="Changer de style">
                                        <lucide_preact_1.RefreshCw size={14}/>
                                    </button>
                                </div>
								<span className="text-[9px] font-black uppercase tracking-[0.2em] text-ink-light/50">
									Identité
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Bottom Bar */}
			<div className="p-4 bg-white border-t border-gray-100 pb-safe shrink-0">
				<Button_1.default onClick={handleCreate} disabled={!managerFirstName.trim() || !managerLastName.trim() || !teamName.trim() || isGenerating} variant="accent" className="w-full py-4 text-sm font-bold shadow-lg shadow-accent/20 rounded-xl uppercase tracking-widest">
					{isGenerating ? (<>
							<lucide_preact_1.Globe className="animate-spin" size={18}/>
							Génération du Monde...
						</>) : (<>
							<lucide_preact_1.Check size={18}/>
							Fonder le Club
						</>)}
				</Button_1.default>
			</div>
			
		</div>);
}
