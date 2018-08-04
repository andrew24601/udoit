"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
class TransactionError extends Error {
}
exports.TransactionError = TransactionError;
class SimpleEventEmitter {
    constructor() {
        this._listeners = {};
    }
    on(name, callback) {
        let listeners = this._listeners[name];
        if (listeners == null) {
            listeners = this._listeners[name] = [];
        }
        listeners.push(callback);
    }
    emit(eventName, ...args) {
        const listeners = this._listeners[eventName];
        if (listeners == null)
            return;
        for (const listener of listeners) {
            listener.apply(this, args);
        }
    }
}
exports.SimpleEventEmitter = SimpleEventEmitter;
class Value extends SimpleEventEmitter {
    constructor(v) {
        super();
        this._value = v;
    }
    value() {
        return this._value;
    }
    update(v) {
        this._value = v;
        this.emit('update', v);
    }
}
exports.Value = Value;
class DoContext {
    constructor() {
        this._runners = [];
    }
    do(fn) {
        const r = new Runner(fn);
        this._runners.push(r);
        r.run();
    }
    value(fn) {
        let result;
        this.do(() => {
            const val = fn();
            if (result === undefined) {
                result = new Value(val);
            }
            else {
                result.update(val);
            }
        });
        return result;
    }
    clear() {
        for (const r of this._runners) {
            r.unlink();
        }
        this._runners = [];
    }
}
exports.DoContext = DoContext;
let currentRunner;
let nextId = 0;
let currentTransactionRunners = {};
let currentTransactionDepth = 0;
function getNextId() {
    return (nextId++).toString(36);
}
class ObservableArray {
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
            throw new TransactionError("Modifying observable array outside of transaction");
        }
        const runners = this.runners;
        for (const r in runners) {
            currentTransactionRunners[r] = runners[r];
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
    splice(start, deleteCount, ...values) {
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
        return this.values.slice(begin, end);
    }
    join(separator) {
        this._r();
        return this.values.join(separator);
    }
    toJSON() {
        return this.values;
    }
}
exports.ObservableArray = ObservableArray;
let activeComputed = [];
function computed(target, propertyName, descriptor) {
    const backingId = "__i" + propertyName;
    const backingRunners = "__r" + propertyName;
    const backingCache = "__c" + propertyName;
    let writeBack = false;
    if (descriptor == null) {
        descriptor = Object.getOwnPropertyDescriptor(target, propertyName);
        writeBack = true;
    }
    const backingGet = descriptor.get;
    descriptor.get = function () {
        if (currentRunner != null) {
            if (this[backingId] == null)
                this[backingId] = getNextId();
            if (this[backingRunners] == null)
                this[backingRunners] = {};
            this[backingRunners][currentRunner.id] = currentRunner;
            currentRunner.observed[this[backingId]] = this[backingRunners];
        }
        if (currentTransactionDepth == 0) {
            if (this.hasOwnProperty(backingCache)) {
                return this[backingCache];
            }
            activeComputed.push(() => {
                delete this[backingCache];
            });
        }
        this[backingCache] = backingGet.apply(this);
        return this[backingCache];
    };
    if (writeBack) {
        Object.defineProperty(target, propertyName, descriptor);
    }
}
exports.computed = computed;
function observable(target, propertyName) {
    const backingProperty = "__v" + propertyName;
    const backingRunners = "__r" + propertyName;
    const backingId = "__i" + propertyName;
    Object.defineProperty(target, backingProperty, {
        enumerable: false,
        writable: true
    });
    Object.defineProperty(target, backingRunners, {
        enumerable: false,
        writable: true
    });
    Object.defineProperty(target, backingId, {
        enumerable: false,
        writable: true
    });
    target[backingProperty] = target[propertyName];
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
                throw new TransactionError("Writing to property '" + propertyName + "' outside of transaction");
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
exports.observable = observable;
function doTransaction(fn) {
    try {
        currentTransactionDepth++;
        fn();
    }
    finally {
        currentTransactionDepth--;
        if (currentTransactionDepth == 0) {
            for (const c of activeComputed) {
                c();
            }
            activeComputed = [];
            const runners = currentTransactionRunners;
            currentTransactionRunners = {};
            for (const r in runners) {
                runners[r].run();
            }
        }
    }
}
exports.doTransaction = doTransaction;
