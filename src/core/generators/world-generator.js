"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWorld = generateWorld;
var db_1 = require("@/core/db/db");
var league_templates_1 = require("./league-templates");
var squad_generator_1 = require("./squad-generator");
var math_1 = require("@/core/utils/math");
var staff_generator_1 = require("./staff-generator");
// Liste de couleurs pour les équipes
var TEAM_COLORS = [
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
// Génération complète d'une nouvelle partie (Monde)
function generateWorld(saveId, userTeamName) {
    return __awaiter(this, void 0, void 0, function () {
        var leagues, _i, LEAGUE_TEMPLATES_1, tpl, id, userTeamId, _a, leagues_1, league, teamNames, playerTeamIndex, i, isUserTeam, colors, teamId, avgSkill, coach, scout, _b, leagues_2, league, teams, teamIds;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    leagues = [];
                    _i = 0, LEAGUE_TEMPLATES_1 = league_templates_1.LEAGUE_TEMPLATES;
                    _c.label = 1;
                case 1:
                    if (!(_i < LEAGUE_TEMPLATES_1.length)) return [3 /*break*/, 4];
                    tpl = LEAGUE_TEMPLATES_1[_i];
                    return [4 /*yield*/, db_1.db.leagues.add({
                            saveId: saveId,
                            name: tpl.name,
                            level: tpl.level,
                            promotionSpots: tpl.promotionSpots,
                            relegationSpots: tpl.relegationSpots,
                        })];
                case 2:
                    id = _c.sent();
                    if (typeof id !== 'number') {
                        throw new Error("Failed to create league: ".concat(tpl.name, ". Received invalid ID: ").concat(id));
                    }
                    leagues.push(__assign(__assign({}, tpl), { id: id }));
                    _c.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    userTeamId = null;
                    _a = 0, leagues_1 = leagues;
                    _c.label = 5;
                case 5:
                    if (!(_a < leagues_1.length)) return [3 /*break*/, 13];
                    league = leagues_1[_a];
                    teamNames = __spreadArray([], league.teamNames, true);
                    // Compléter avec des noms génériques si besoin
                    while (teamNames.length < league.teamsCount) {
                        teamNames.push("Club ".concat(league.name.substring(0, 3), " ").concat(teamNames.length + 1));
                    }
                    playerTeamIndex = -1;
                    if (league.level === league_templates_1.LEAGUE_TEMPLATES.length) {
                        playerTeamIndex = (0, math_1.randomInt)(0, teamNames.length - 1);
                        teamNames[playerTeamIndex] = userTeamName;
                    }
                    i = 0;
                    _c.label = 6;
                case 6:
                    if (!(i < league.teamsCount)) return [3 /*break*/, 12];
                    isUserTeam = (i === playerTeamIndex && playerTeamIndex !== -1);
                    colors = (0, math_1.getRandomElement)(TEAM_COLORS);
                    return [4 /*yield*/, db_1.db.teams.add({
                            saveId: saveId,
                            leagueId: league.id,
                            name: teamNames[i],
                            reputation: league.reputation, // Base reputation
                            budget: isUserTeam ? 100 : league.reputation * 10,
                            stadiumCapacity: league.reputation * 50,
                            stadiumName: "".concat(teamNames[i], " Park"),
                            confidence: 50,
                            seasonGoal: isUserTeam ? "PROMOTION" : "MID_TABLE",
                            supportersMood: 50,
                            fanCount: league.reputation * 10,
                            primaryColor: colors[0],
                            secondaryColor: colors[1],
                            points: 0,
                            matchesPlayed: 0,
                            goalsFor: 0,
                            goalsAgainst: 0,
                            goalDifference: 0,
                            version: 1
                        })];
                case 7:
                    teamId = _c.sent();
                    if (typeof teamId !== 'number') {
                        throw new Error("Failed to create team: ".concat(teamNames[i], " in league ").concat(league.name, ". Received invalid ID: ").concat(teamId));
                    }
                    if (isUserTeam)
                        userTeamId = teamId;
                    avgSkill = (11 - league.level * 2) + (Math.random() * 2);
                    return [4 /*yield*/, (0, squad_generator_1.generateFullSquad)(saveId, teamId, avgSkill)];
                case 8:
                    _c.sent();
                    coach = (0, staff_generator_1.generateStaffMember)(saveId, teamId, avgSkill);
                    coach.role = "COACH";
                    scout = (0, staff_generator_1.generateStaffMember)(saveId, teamId, avgSkill);
                    scout.role = "SCOUT";
                    return [4 /*yield*/, db_1.db.staff.add(coach)];
                case 9:
                    _c.sent();
                    return [4 /*yield*/, db_1.db.staff.add(scout)];
                case 10:
                    _c.sent();
                    _c.label = 11;
                case 11:
                    i++;
                    return [3 /*break*/, 6];
                case 12:
                    _a++;
                    return [3 /*break*/, 5];
                case 13:
                    // Ensure userTeamId is set before proceeding
                    if (userTeamId === null) {
                        throw new Error("User team was not created. This should not happen.");
                    }
                    _b = 0, leagues_2 = leagues;
                    _c.label = 14;
                case 14:
                    if (!(_b < leagues_2.length)) return [3 /*break*/, 18];
                    league = leagues_2[_b];
                    return [4 /*yield*/, db_1.db.teams.where("leagueId").equals(league.id).toArray()];
                case 15:
                    teams = _c.sent();
                    teamIds = teams.map(function (t) { return t.id; });
                    if (teamIds.length === 0) {
                        throw new Error("No teams found for league ".concat(league.name, " (").concat(league.id, "). Cannot generate fixtures."));
                    }
                    return [4 /*yield*/, (0, league_templates_1.generateSeasonFixtures)(saveId, league.id, teamIds)];
                case 16:
                    _c.sent();
                    _c.label = 17;
                case 17:
                    _b++;
                    return [3 /*break*/, 14];
                case 18: 
                // 6. Génération du marché du staff (candidats libres)
                return [4 /*yield*/, (0, staff_generator_1.generateInitialStaffMarket)(saveId)];
                case 19:
                    // 6. Génération du marché du staff (candidats libres)
                    _c.sent();
                    return [2 /*return*/, { userTeamId: userTeamId }];
            }
        });
    });
}
