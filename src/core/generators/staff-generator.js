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
exports.generateStaffMember = generateStaffMember;
exports.generateInitialStaffMarket = generateInitialStaffMarket;
var db_1 = require("@/core/db/db");
var math_1 = require("@/core/utils/math");
var FIRST_NAMES = [
    "Arthur", "William", "Henry", "George", "Thomas", "John", "Edward", "Charles", "Walter", "Frank",
    "Joseph", "Robert", "James", "Harry", "Alfred", "Ernest", "Albert", "Richard", "Fred", "Herbert",
];
var LAST_NAMES = [
    "Smith", "Jones", "Williams", "Taylor", "Brown", "Davies", "Evans", "Wilson", "Thomas", "Roberts",
    "Johnson", "Lewis", "Walker", "Robinson", "Wood", "Thompson", "Wright", "White", "Watson", "Harrison",
];
var ROLES = ["COACH", "SCOUT", "PHYSICAL_TRAINER"];
var STAFF_TRAITS = [
    "MOTIVATOR",
    "TACTICIAN",
    "YOUTH_SPECIALIST",
    "STRATEGIST",
    "HARD_DRILLER",
];
function generateStaffMember(saveId, teamId, avgSkill) {
    if (avgSkill === void 0) { avgSkill = 5; }
    var firstName = (0, math_1.getRandomElement)(FIRST_NAMES);
    var lastName = (0, math_1.getRandomElement)(LAST_NAMES);
    var role = (0, math_1.getRandomElement)(ROLES);
    var age = (0, math_1.randomInt)(35, 65);
    var skill = Math.min(100, Math.max(1, Math.round(avgSkill * 10 + (Math.random() * 20 - 10))));
    var stats = {
        management: (0, math_1.randomInt)(1, 20),
        training: (0, math_1.randomInt)(1, 20),
        tactical: (0, math_1.randomInt)(1, 20),
        physical: (0, math_1.randomInt)(1, 20),
        goalkeeping: (0, math_1.randomInt)(1, 20),
    };
    // Spécialisation selon le rôle
    if (role === "COACH") {
        stats.training = Math.min(20, stats.training + 5);
        stats.tactical = Math.min(20, stats.tactical + 5);
    }
    else if (role === "PHYSICAL_TRAINER") {
        stats.physical = Math.min(20, stats.physical + 8);
    }
    // DNA Visuel (même format que les joueurs)
    var skinTone = (0, math_1.randomInt)(0, 4);
    var hairType = (0, math_1.randomInt)(0, 6);
    var hairColor = (0, math_1.randomInt)(0, 4);
    var beard = (0, math_1.randomInt)(0, 10) > 4 ? (0, math_1.randomInt)(1, 4) : 0;
    var glasses = Math.random() > 0.7 ? 1 : 0;
    var dna = "".concat(skinTone, "-").concat(hairType, "-").concat(hairColor, "-").concat(beard, "-").concat(glasses);
    var wage = Math.round(skill * 50);
    // Attribution de traits (10-30% de chance d'avoir un trait, max 2)
    var traits = [];
    if (Math.random() > 0.7) {
        traits.push((0, math_1.getRandomElement)(STAFF_TRAITS));
        if (Math.random() > 0.8) {
            var secondTrait = (0, math_1.getRandomElement)(STAFF_TRAITS);
            if (!traits.includes(secondTrait)) {
                traits.push(secondTrait);
            }
        }
    }
    return {
        saveId: saveId,
        teamId: teamId,
        firstName: firstName,
        lastName: lastName,
        role: role,
        skill: skill,
        age: age,
        wage: wage,
        dna: dna,
        stats: stats,
        preferredStrategy: (0, math_1.getRandomElement)(["DEFENSIVE", "BALANCED", "OFFENSIVE"]),
        traits: traits,
        confidence: (0, math_1.randomInt)(40, 90),
        joinedDay: 1,
        joinedSeason: 1
    };
}
function generateInitialStaffMarket(saveId_1) {
    return __awaiter(this, arguments, void 0, function (saveId, count) {
        var staff, i;
        if (count === void 0) { count = 20; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    staff = [];
                    for (i = 0; i < count; i++) {
                        staff.push(generateStaffMember(saveId, undefined, 5));
                    }
                    return [4 /*yield*/, db_1.db.staff.bulkAdd(staff)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
