class Runner {
    id: string = getNextId();
    observed: any = {};
    fn:()=>void

    constructor(fn:()=>void) {
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
        } finally {
            currentRunner = previousRunner;
        }
    }
}

export class TransactionError extends Error {
}

export class SimpleEventEmitter {
    _listeners

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
        if (listeners == null) return;
        for (const listener of listeners) {
            listener.apply(this, args);
        }
    }
}

export class Value<T> extends SimpleEventEmitter {
    _value : T;

    constructor(v: T) {
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

export class DoContext {
    _runners = [];

    do(fn:()=>void) {
        const r : Runner = new Runner(fn);
        this._runners.push(r);
        r.run();
    }

    value<T>(fn:()=>T):Value<T> {
        let result;
        this.do(()=>{
            const val = fn();
            if (result === undefined) {
                result = new Value<T>(val);
            } else {
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

let currentRunner : Runner;
let nextId = 0;

let currentTransactionRunners = {};
let currentTransactionDepth = 0;

function getNextId() {
    return (nextId++).toString(36);
}

export class ObservableArray<T> {
    id: string = getNextId()
    values: T[] = [];
    runners = {};

    _r() {
        if (currentRunner != null) {
            this.runners[currentRunner.id] = currentRunner;
            currentRunner.observed[this.id] = this.runners;
        }
    }

    _w() {
        if (currentTransactionDepth == 0) {
            throw new TransactionError("Modifying observable array outside of transaction")
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

    get(idx: number) {
        this._r();
        return this.values[idx];
    }

    set(idx: number, v: T) {
        this._w();
        this.values[idx] = v;
    }

    push(...values: T[]) {
        this._w();
        for (const v of values) {
            this.values.push(v);
        }
    }

    splice(start: number, deleteCount: number, ...values: T[]) {
        this._w();
        this.values.splice(start, deleteCount, ...values);
        return this;
    }

    indexOf(v: T, fromIndex?: number) {
        this._r();
        return this.values.indexOf(v, fromIndex);
    }

    sort(compareFn?:(a:T, b:T)=>number) {
        this._w();
        this.values.sort(compareFn);
    }

    slice(begin?: number, end?: number) {
        this._r();
        return this.values.slice(begin, end);
    }

    join(separator?: string) {
        this._r();
        return this.values.join(separator);
    }

    toJSON() {
        return this.values;
    }
}

export function observable(target: any, propertyName: string) {
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
        get: function() {
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
        set: function(x) {
            if (currentTransactionDepth == 0) {
                throw new TransactionError("Writing to property '" + propertyName + "' outside of transaction")
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

export function doTransaction(fn: ()=>void) {
    try {
        currentTransactionDepth++;
        fn();
    } finally {
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
