"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Runner = /** @class */ (function () {
    function Runner(fn) {
        this.id = getNextId();
        this.observed = {};
        this.fn = fn;
    }
    Runner.prototype.unlink = function () {
        var observed = this.observed;
        for (var o in observed) {
            delete observed[o][this.id];
        }
        this.observed = {};
    };
    Runner.prototype.run = function () {
        this.unlink();
        var previousRunner = currentRunner;
        try {
            currentRunner = this;
            this.fn();
        }
        finally {
            currentRunner = previousRunner;
        }
    };
    return Runner;
}());
var RedoContext = /** @class */ (function () {
    function RedoContext() {
        this.runners = [];
    }
    RedoContext.prototype.do = function (fn) {
        var r = new Runner(fn);
        this.runners.push(r);
        r.run();
    };
    RedoContext.prototype.clear = function () {
        for (var _i = 0, _a = this.runners; _i < _a.length; _i++) {
            var r = _a[_i];
            r.unlink();
        }
        this.runners = [];
    };
    return RedoContext;
}());
exports.RedoContext = RedoContext;
var currentRunner;
var nextId = 0;
var currentTransactionRunners = {};
var currentTransactionDepth = 0;
function getNextId() {
    return (nextId++).toString(36);
}
var ObservableArray = /** @class */ (function () {
    function ObservableArray() {
        this.id = getNextId();
        this.values = [];
        this.runners = {};
    }
    ObservableArray.prototype._r = function () {
        if (currentRunner != null) {
            this.runners[currentRunner.id] = currentRunner;
            currentRunner.observed[this.id] = this.runners;
        }
    };
    ObservableArray.prototype._w = function () {
        if (currentTransactionDepth == 0) {
            throw new Error("Modifying observable array outside of transaction");
        }
        var runners = this.runners;
        if (runners != null) {
            for (var r in runners) {
                currentTransactionRunners[r] = runners[r];
            }
        }
    };
    Object.defineProperty(ObservableArray.prototype, "length", {
        get: function () {
            this._r();
            return this.values.length;
        },
        enumerable: true,
        configurable: true
    });
    ObservableArray.prototype.get = function (idx) {
        this._r();
        return this.values[idx];
    };
    ObservableArray.prototype.set = function (idx, v) {
        this._w();
        this.values[idx] = v;
    };
    ObservableArray.prototype.push = function () {
        var values = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            values[_i] = arguments[_i];
        }
        this._w();
        for (var _a = 0, values_1 = values; _a < values_1.length; _a++) {
            var v = values_1[_a];
            this.values.push(v);
        }
    };
    ObservableArray.prototype.splice = function (start, deleteCount) {
        if (deleteCount === void 0) { deleteCount = 0; }
        var values = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            values[_i - 2] = arguments[_i];
        }
        this._w();
        (_a = this.values).splice.apply(_a, [start, deleteCount].concat(values));
        return this;
        var _a;
    };
    ObservableArray.prototype.indexOf = function (v, fromIndex) {
        this._r();
        return this.values.indexOf(v, fromIndex);
    };
    ObservableArray.prototype.sort = function (compareFn) {
        this._w();
        this.values.sort(compareFn);
    };
    ObservableArray.prototype.slice = function (begin, end) {
        this._r();
        return this.values.splice(begin, end);
    };
    return ObservableArray;
}());
exports.ObservableArray = ObservableArray;
function observable(target, propertyName) {
    var backingProperty = "__v" + propertyName;
    var backingRunners = "__r" + propertyName;
    var backingId = "__i" + propertyName;
    Object.defineProperty(target, propertyName, {
        get: function () {
            if (currentRunner != null) {
                if (this[backingId] == null)
                    this[backingId] = getNextId();
                if (this[backingRunners] == null)
                    this[backingRunners] = {};
                this[backingRunners][currentRunner.id] = currentRunner;
                currentRunner.observed[this[backingId]] = this[backingRunners];
            }
            return this[backingProperty];
        },
        set: function (x) {
            if (currentTransactionDepth == 0) {
                throw new Error("Writing to property '" + propertyName + "' outside of transaction");
            }
            if (x === this[backingProperty]) {
                return;
            }
            this[backingProperty] = x;
            var runners = this[backingRunners];
            if (runners != null) {
                for (var r in runners) {
                    currentTransactionRunners[r] = runners[r];
                }
            }
        }
    });
}
exports.observable = observable;
function doTransaction(fn) {
    try {
        currentTransactionDepth++;
        fn();
    }
    finally {
        currentTransactionDepth--;
        if (currentTransactionDepth == 0) {
            var runners = currentTransactionRunners;
            currentTransactionRunners = {};
            for (var r in runners) {
                runners[r].run();
            }
        }
    }
}
exports.doTransaction = doTransaction;
