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
exports.LEAGUE_TEMPLATES = void 0;
exports.generateSeasonFixtures = generateSeasonFixtures;
var db_1 = require("@/core/db/db");
exports.LEAGUE_TEMPLATES = [
    {
        name: "Premier Division",
        level: 1,
        reputation: 120,
        promotionSpots: 0,
        relegationSpots: 2,
        teamsCount: 10,
        teamNames: [
            "London FC",
            "Royal Albion",
            "United Steam",
            "Victoria FC",
            "Iron Steamers",
            "Railway United",
            "Engineers FC",
            "London Wasps",
            "The Gunners",
            "Borough United",
        ],
    },
    {
        name: "First Division",
        level: 2,
        reputation: 100,
        promotionSpots: 2,
        relegationSpots: 2,
        teamsCount: 10,
        teamNames: [
            "Kensington FC",
            "Wanderers FC",
            "Royal Engineers",
            "Civil Service",
            "Crusaders",
            "No Names Club",
            "Barnes FC",
            "Crystal Palace",
            "Blackheath",
            "Perceval House",
        ],
    },
    {
        name: "Second Division",
        level: 3,
        reputation: 80,
        promotionSpots: 2,
        relegationSpots: 2,
        teamsCount: 10,
        teamNames: [
            "Clapham Rovers",
            "Upton Park",
            "Maidenhead",
            "Great Marlow",
            "Reigate Priory",
            "Swifts",
            "Old Etonians",
            "Oxford University",
            "Cambridge University",
            "Hitchin",
        ],
    },
    {
        name: "Third Division",
        level: 4,
        reputation: 60,
        promotionSpots: 2,
        relegationSpots: 2,
        teamsCount: 10,
        teamNames: [
            "Bristol City",
            "Cardiff Town",
            "Swansea United",
            "Plymouth Argyle",
            "Exeter Chiefs",
            "Southampton FC",
            "Portsmouth FC",
            "Brighton & Hove",
            "Reading FC",
            "Oxford City",
        ],
    },
    {
        name: "Regional League",
        level: 5,
        reputation: 30,
        promotionSpots: 2,
        relegationSpots: 0,
        teamsCount: 10,
        teamNames: [
            "Kent United",
            "Surrey City",
            "Essex Wanderers",
            "Sussex Albion",
            "Dorset FC",
            "Cornwall Rovers",
            "Hampshire Athletic",
            "Devon United",
            "Somerset FC",
            "Berkshire United",
        ],
    },
];
function generateSeasonFixtures(saveId, leagueId, teamIds) {
    return __awaiter(this, void 0, void 0, function () {
        var numRounds, halfRounds, matchesPerRound, fixtures, currentDay, round, isLastRound, roundPressure, match, home, away, returnFixtures;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Algorithme Round-Robin simple (Aller-Retour)
                    if (teamIds.length % 2 !== 0) {
                        teamIds.push(-1); // Bye
                    }
                    numRounds = (teamIds.length - 1) * 2;
                    halfRounds = numRounds / 2;
                    matchesPerRound = teamIds.length / 2;
                    fixtures = [];
                    currentDay = 6;
                    // Aller
                    for (round = 0; round < halfRounds; round++) {
                        isLastRound = round === halfRounds - 1;
                        roundPressure = Math.min(100, (round / halfRounds) * 50);
                        for (match = 0; match < matchesPerRound; match++) {
                            home = teamIds[match];
                            away = teamIds[teamIds.length - 1 - match];
                            if (home !== -1 && away !== -1) {
                                fixtures.push({
                                    saveId: saveId,
                                    leagueId: leagueId,
                                    day: currentDay,
                                    homeTeamId: home,
                                    awayTeamId: away,
                                    played: false,
                                    homeScore: 0,
                                    awayScore: 0,
                                    pressure: Math.floor(roundPressure + (isLastRound ? 40 : 0)) // Gros pic en fin de championnat
                                });
                            }
                        }
                        // Rotation (sauf le premier élément)
                        teamIds.splice(1, 0, teamIds.pop());
                        currentDay += 7; // Un match par semaine
                    }
                    returnFixtures = fixtures.map(function (f, idx) {
                        var roundIdx = Math.floor(idx / matchesPerRound) + halfRounds;
                        var isLastRound = roundIdx === numRounds - 1;
                        var roundPressure = Math.min(100, (roundIdx / numRounds) * 70);
                        return __assign(__assign({}, f), { day: f.day + halfRounds * 7, homeTeamId: f.awayTeamId, awayTeamId: f.homeTeamId, pressure: Math.floor(roundPressure + (isLastRound ? 30 : 0)) });
                    });
                    return [4 /*yield*/, db_1.db.matches.bulkAdd(__spreadArray(__spreadArray([], fixtures, true), returnFixtures, true))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
