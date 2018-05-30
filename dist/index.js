class Runner {
    constructor(fn) {
        this.id = getNextId();
        this.observed = {};
        this.fn = fn;
    }
    unlink() {
        const observed = this.observed;
        for (const o in observed) {
            delete observed[o][this.id];
        }
        this.observed = {};
    }
    run() {
        this.unlink();
        const previousRunner = currentRunner;
        try {
            currentRunner = this;
            this.fn();
        }
        finally {
            currentRunner = previousRunner;
        }
    }
}
export class DoContext {
    constructor() {
        this.runners = [];
    }
    do(fn) {
        const r = new Runner(fn);
        this.runners.push(r);
        r.run();
    }
    value(fn) {
        return (callback) => {
            this.do(() => {
                const val = fn();
                callback(val);
            });
            return;
        };
    }
    clear() {
        for (const r of this.runners) {
            r.unlink();
        }
        this.runners = [];
    }
}
let currentRunner;
let nextId = 0;
let currentTransactionRunners = {};
let currentTransactionDepth = 0;
function getNextId() {
    return (nextId++).toString(36);
}
export class ObservableArray {
    constructor() {
        this.id = getNextId();
        this.values = [];
        this.runners = {};
    }
    _r() {
        if (currentRunner != null) {
            this.runners[currentRunner.id] = currentRunner;
            currentRunner.observed[this.id] = this.runners;
        }
    }
    _w() {
        if (currentTransactionDepth == 0) {
            throw new Error("Modifying observable array outside of transaction");
        }
        const runners = this.runners;
        if (runners != null) {
            for (const r in runners) {
                currentTransactionRunners[r] = runners[r];
            }
        }
    }
    get length() {
        this._r();
        return this.values.length;
    }
    get(idx) {
        this._r();
        return this.values[idx];
    }
    set(idx, v) {
        this._w();
        this.values[idx] = v;
    }
    push(...values) {
        this._w();
        for (const v of values) {
            this.values.push(v);
        }
    }
    splice(start, deleteCount = 0, ...values) {
        this._w();
        this.values.splice(start, deleteCount, ...values);
        return this;
    }
    indexOf(v, fromIndex) {
        this._r();
        return this.values.indexOf(v, fromIndex);
    }
    sort(compareFn) {
        this._w();
        this.values.sort(compareFn);
    }
    slice(begin, end) {
        this._r();
        return this.values.splice(begin, end);
    }
}
export function observable(target, propertyName) {
    const backingProperty = "__v" + propertyName;
    const backingRunners = "__r" + propertyName;
    const backingId = "__i" + propertyName;
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
            const runners = this[backingRunners];
            if (runners != null) {
                for (const r in runners) {
                    currentTransactionRunners[r] = runners[r];
                }
            }
        }
    });
}
export function doTransaction(fn) {
    try {
        currentTransactionDepth++;
        fn();
    }
    finally {
        currentTransactionDepth--;
        if (currentTransactionDepth == 0) {
            const runners = currentTransactionRunners;
            currentTransactionRunners = {};
            for (const r in runners) {
                runners[r].run();
            }
        }
    }
}
