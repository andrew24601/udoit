export declare class TransactionError extends Error {
}
export declare class SimpleEventEmitter {
    _listeners: any;
    constructor();
    on(name: any, callback: any): void;
    emit(eventName: any, ...args: any[]): void;
}
export declare class Value<T> extends SimpleEventEmitter {
    _value: T;
    constructor(v: T);
    value(): T;
    update(v: any): void;
}
export declare class DoContext {
    _runners: any[];
    do(fn: () => void): void;
    value<T>(fn: () => T): Value<T>;
    clear(): void;
}
export declare class ObservableArray<T> {
    id: string;
    values: T[];
    runners: {};
    _r(): void;
    _w(): void;
    readonly length: number;
    get(idx: number): T;
    set(idx: number, v: T): void;
    push(...values: T[]): void;
    splice(start: number, deleteCount: number, ...values: T[]): this;
    indexOf(v: T, fromIndex?: number): number;
    sort(compareFn?: (a: T, b: T) => number): void;
    slice(begin?: number, end?: number): T[];
    join(separator?: string): string;
    toJSON(): T[];
}
export declare function observable(target: any, propertyName: string): void;
export declare function doTransaction(fn: () => void): void;
