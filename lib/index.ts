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

export class DoContext {
    runners = [];

    do(fn:()=>void) {
        const r : Runner = new Runner(fn);
        this.runners.push(r);
        r.run();
    }

    value<T>(fn:()=>T):(callback:(v:T)=>void)=>void {
        return (callback:(v:T)=>void)=>{
            this.do(()=>{
                const val = fn();
                callback(val);
            })
            return 
        }
    }

    clear() {
        for (const r of this.runners) {
            r.unlink();
        }
        this.runners = [];
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

    splice(start: number, deleteCount: number = 0, ...values: T[]) {
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
}

let activeComputed = [];

export function computed(target, propertyName, descriptor: PropertyDescriptor) {
    const backingId = "__i" + propertyName;
    const backingRunners = "__r" + propertyName;
    let writeBack = false;

    if (descriptor == null) {
        descriptor = Object.getOwnPropertyDescriptor(target, propertyName);
        writeBack = true;
    }

    const backingGet = descriptor.get;
    let hasCachedValue = false;
    let cachedValue = undefined;
    
    descriptor.get = function() {
        if (currentRunner != null) {
            if (this[backingId] == null)
                this[backingId] = getNextId();
            if (this[backingRunners] == null)
                this[backingRunners] = {};
            this[backingRunners][currentRunner.id] = currentRunner;
            currentRunner.observed[this[backingId]] = this[backingRunners];
        }
        
        if (currentTransactionDepth == 0) {
            if (hasCachedValue) {
                return cachedValue;
            }
            activeComputed.push(()=>{
                hasCachedValue = false;
            });
            hasCachedValue = true;
        }
        cachedValue = backingGet.apply(this);
        return cachedValue;
    }

    if (writeBack) {
        Object.defineProperty(target, propertyName, descriptor);
    }
}

export function observable(target: any, propertyName: string) {
    const backingProperty = "__v" + propertyName;
    const backingRunners = "__r" + propertyName;
    const backingId = "__i" + propertyName;

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
