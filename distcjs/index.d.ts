export declare class TransactionError extends Error {
}
export declare class DoContext {
    runners: any[];
    do(fn: () => void): void;
    value<T>(fn: () => T): (callback: (v: T) => void) => void;
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
    splice(start: number, deleteCount?: number, ...values: T[]): this;
    indexOf(v: T, fromIndex?: number): number;
    sort(compareFn?: (a: T, b: T) => number): void;
    slice(begin?: number, end?: number): T[];
    join(separator?: string): string;
}
export declare function computed(target: any, propertyName: any, descriptor: PropertyDescriptor): void;
export declare function observable(target: any, propertyName: string): void;
export declare function doTransaction(fn: () => void): void;
