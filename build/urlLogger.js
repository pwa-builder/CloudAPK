"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logUrlResult = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
function logUrlResult(url, success, error) {
    // This environment variable is a secret, and set only in deployed environments
    const logApiUrl = process.env.ANALYSISLOGURL;
    if (!logApiUrl) {
        return Promise.resolve();
    }
    return (0, node_fetch_1.default)(logApiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify({
            url: url,
            androidPackage: success,
            androidPackageError: error
        })
    }).catch(err => console.error("Unable to POST to log analysis URL"));
}
exports.logUrlResult = logUrlResult;
//# sourceMappingURL=urlLogger.js.map