"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Promise = require("bluebird");
function defer() {
    var resolve;
    var reject;
    var promise = new Promise(function () {
        resolve = arguments[0];
        reject = arguments[1];
    });
    return {
        resolve: resolve,
        reject: reject,
        promise: promise
    };
}
exports.defer = defer;
