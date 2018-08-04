const { DoContext, observable, computed, TransactionError, doTransaction, ObservableArray, SimpleEventEmitter } = require('../distcjs/index');
const { expect } = require('chai');

function makeSimpleModel() {
    const model = {
        firstName: "First",
        lastName: "Last"
    }
    observable(model, "firstName")
    observable(model, "lastName")
    return model;
}

function makeComputedModel() {
    const model = {
        _computeCount: 0,
        firstName: "First",
        lastName: "Last",
        get fullName() {
            this._computeCount++;
            return this.firstName + " " + this.lastName;
        }
    }
    observable(model, "firstName");
    observable(model, "lastName");

    return model;
}


describe('Simple model test', ()=>{
    it('construct simple model', () => {
        const model = makeSimpleModel();

        expect(model.firstName).to.equal("First");
        expect(model.lastName).to.equal("Last");

        expect(()=>{model.firstName = "Bob"}).to.throw(TransactionError)
    }),
    it("writing to property outside transaction should fail", () => {
        const model = makeSimpleModel();

        expect(()=>{model.firstName = "Bob"}).to.throw(TransactionError)
        expect(()=>{model.lastName = "Surname"}).to.throw(TransactionError)
    }),
    it("writing to property inside transaction should succeed", () => {
        const model = makeSimpleModel();

        doTransaction(()=>{
            model.firstName = "Bob";
            model.lastName = "Surname";
        });

        expect(model.firstName).to.equal("Bob");
        expect(model.lastName).to.equal("Surname");
    })
});

describe("Computed model test", ()=>{
    it('construct computed model', ()=>{
        const model = makeComputedModel();

        expect(model.firstName).to.equal("First");
        expect(model.lastName).to.equal("Last");
        expect(model.fullName).to.equal("First Last");
    }),
    it('update computed model', ()=>{
        const model = makeComputedModel();

        expect(model.firstName).to.equal("First");
        expect(model.lastName).to.equal("Last");
        expect(model.fullName).to.equal("First Last");

        doTransaction(()=>{
            model.firstName = "Bob";
        })

        expect(model.fullName).to.equal("Bob Last");
    })
});

describe('Observable array test', ()=>{
    it("creating observable array", ()=>{
        const arr = new ObservableArray();
        expect(arr.length).to.equal(0);
    }),
    it("writing to observable array outside transaction should fail", ()=>{
        const arr = new ObservableArray();
        expect(()=>{arr.set(0, "hello")}).to.throw(TransactionError);
    }),
    it("pushing to observable array outside transaction should fail", ()=>{
        const arr = new ObservableArray();
        expect(()=>{arr.push(1)}).to.throw(TransactionError);
    }),
    it("pushing to observable array in transaction should succeed", ()=>{
        const arr = new ObservableArray();
        doTransaction(()=>{
            arr.push(1);
            arr.push(2);
            arr.push(3);
        })
        expect(arr.length).to.equal(3);
        expect(arr.get(0)).to.equal(1);
        expect(arr.get(1)).to.equal(2);
        expect(arr.get(2)).to.equal(3);
    }),
    it("writing to observable array in transaction should succeed", ()=>{
        const arr = new ObservableArray();
        doTransaction(()=>{
            arr.push(1);
            arr.push(2);
            arr.push(3);
        })
        expect(arr.length).to.equal(3);
        expect(arr.get(0)).to.equal(1);
        expect(arr.get(1)).to.equal(2);
        expect(arr.get(2)).to.equal(3);
        doTransaction(()=>{
            arr.set(0, 4);
            arr.set(1, 5);
            arr.set(2, 6);
        })
        expect(arr.length).to.equal(3);
        expect(arr.get(0)).to.equal(4);
        expect(arr.get(1)).to.equal(5);
        expect(arr.get(2)).to.equal(6);
    })
});

class ExpectedSequence {
    constructor(expectations) {
        this._expectedResults = [];
        for (const v of expectations) {
            this._expectedResults.push(v);
        }
        this._expectedResults
    }

    receive(v) {
        expect(this._expectedResults.length).to.not.equal(0);
        expect(v).to.equal(this._expectedResults[0]);
        this._expectedResults.splice(0, 1);
    }

    expectComplete() {
        expect(this._expectedResults.length).to.equal(0);
    }
}

describe('Simple DoContext test', ()=>{
    it("using do should evaluate synchronously", () => {
        const model = makeSimpleModel();
        const ctx = new DoContext();

        const callback = new ExpectedSequence(["First Last"]);

        ctx.do(()=>{
            callback.receive(model.firstName + " " + model.lastName);
        });

        callback.expectComplete();
    }),
    it("using do should update after transaction completes", () => {
        const model = makeSimpleModel();
        const ctx = new DoContext();

        const callback = new ExpectedSequence(["First Last", "Bob Surname"]);

        ctx.do(()=>{
            callback.receive(model.firstName + " " + model.lastName);
        });

        doTransaction(()=>{
            model.firstName = "Mary";
            model.firstName = "Bob";
            model.lastName = "Surname";
        });

        callback.expectComplete();
    }),
    it("using do should update after each transaction completes", () => {
        const model = makeSimpleModel();
        const ctx = new DoContext();

        const callback = new ExpectedSequence(["First Last", "Bob Last", "Bob Surname"]);

        ctx.do(()=>{
            callback.receive(model.firstName + " " + model.lastName);
        });

        doTransaction(()=>{
            model.firstName = "Bob";
        });

        doTransaction(()=>{
            model.lastName = "Surname";
        });

        callback.expectComplete();
    }),
    it("using do should not update if value doesn't actually change", () => {
        const model = makeSimpleModel();
        const ctx = new DoContext();

        const callback = new ExpectedSequence(["First Last"]);

        ctx.do(()=>{
            callback.receive(model.firstName + " " + model.lastName);
        });

        doTransaction(()=>{
            model.firstName = "First";
            model.lastName = "Last";
        });

        callback.expectComplete();
    }),
    it("using do should stop updating if context is cleared", () => {
        const model = makeSimpleModel();
        const ctx = new DoContext();

        const callback = new ExpectedSequence(["First Last", "Bob Last", "Bob Surname"]);

        ctx.do(()=>{
            callback.receive(model.firstName + " " + model.lastName);
        });

        doTransaction(()=>{
            model.firstName = "Bob";
        });

        doTransaction(()=>{
            model.lastName = "Surname";
        });

        ctx.clear();

        doTransaction(()=>{
            model.firstName = "Mary";
        });

        doTransaction(()=>{
            model.lastName = "Jane";
        });

        callback.expectComplete();
    })
});

describe('DoContext value computed test', ()=>{
    it("computed should update", ()=>{
        const ctx = new DoContext();
        const callback = new ExpectedSequence(["First Last", "Mary Last", "Bob Last"]);
        const model = makeComputedModel();

        const value = ctx.value(()=>model.fullName);

        callback.receive(value.value());
        value.on("update", (v)=>callback.receive(v));

        doTransaction(()=>{
            model.firstName = "Mary";
        });

        doTransaction(()=>{
            model.firstName = "Bob";
        });

        callback.expectComplete();
    }),
    it("computed should update (nested transaction)", ()=>{
        const ctx = new DoContext();
        const callback = new ExpectedSequence(["First Last", "Mary Jones", "Bob Jones"]);
        const model = makeComputedModel();

        const valuable = ctx.value(()=>model.fullName);

        callback.receive(valuable.value());
        valuable.on("update", (v)=>callback.receive(v));

        doTransaction(()=>{
            model.firstName = "Mary";
            doTransaction(()=>{
                model.lastName = "Jones";
            });
        });

        doTransaction(()=>{
            model.firstName = "Bob";
        });

        callback.expectComplete();
    })
});

describe('EventEmitter test', ()=>{
    it("emit with no listeners", ()=>{
        const em = new SimpleEventEmitter();
        em.emit("hello");
    }),
    it("add multiple listeneres", ()=>{
        const em = new SimpleEventEmitter();
        let updateCount = 0;
        em.on('update', ()=>updateCount++);
        em.on('update', ()=>updateCount++);
        em.emit('update');
        expect(updateCount).to.equal(2);
    })
})

describe('DoContext ObservableArray test', ()=>{
    it("do should track array length", ()=>{
        const ctx = new DoContext();
        const callback = new ExpectedSequence([0, 3, 4]);
        const arr = new ObservableArray();

        ctx.do(()=>{
            callback.receive(arr.length);
        });

        doTransaction(()=>{
            arr.push(1);
            arr.push(2);
            arr.push(3);
        });

        doTransaction(()=>{
            arr.push(4);
        });

        callback.expectComplete();
    }),
    it("removing items with splice", ()=>{
        const ctx = new DoContext();
        const callback = new ExpectedSequence(["", "1,2,3", "1,3"]);
        const arr = new ObservableArray();

        ctx.do(()=>{
            callback.receive(arr.join(","));
        });

        doTransaction(()=>{
            arr.push(1);
            arr.push(2);
            arr.push(3);
        });

        doTransaction(()=>{
            arr.splice(1, 1);
        });
        callback.expectComplete();
    }),
    it("inserting items with splice", ()=>{
        const ctx = new DoContext();
        const callback = new ExpectedSequence(["", "1,2,3", "1,2,4,3"]);
        const arr = new ObservableArray();

        ctx.do(()=>{
            callback.receive(arr.join(","));
        });

        doTransaction(()=>{
            arr.push(1);
            arr.push(2);
            arr.push(3);
        });

        doTransaction(()=>{
            arr.splice(2, 0, 4);
        });
        callback.expectComplete();
    }),
    it("using indexOf", ()=>{
        const ctx = new DoContext();
        const callback = new ExpectedSequence([-1, 1, 3, -1]);
        const arr = new ObservableArray();

        ctx.do(()=>{
            callback.receive(arr.indexOf("Hurkle"));
        });

        doTransaction(()=>{
            arr.push("Waldo");
            arr.push("Hurkle");
        });

        doTransaction(()=>{
            arr.splice(0, 0, "Carmen", "Sandiego");
        });

        doTransaction(()=>{
            arr.splice(0, arr.length);
        });
        callback.expectComplete();
    }),
    it("sorting elements", ()=>{
        const ctx = new DoContext();
        const callback = new ExpectedSequence(["", "3,2,1", "1,2,3"]);
        const arr = new ObservableArray();

        ctx.do(()=>{
            callback.receive(arr.join(","));
        });

        doTransaction(()=>{
            arr.push(3);
            arr.push(2);
            arr.push(1);
        });

        doTransaction(()=>{
            arr.sort();
        });
        callback.expectComplete();
    }),
    it("slicing elements", ()=>{
        const ctx = new DoContext();
        const callback = new ExpectedSequence(["", "3,2,1", "1,2,3"]);
        const arr = new ObservableArray();

        ctx.do(()=>{
            callback.receive(arr.join(","));
        });

        doTransaction(()=>{
            arr.push(3);
            arr.push(2);
            arr.push(1);
        });

        expect(arr.slice(0, 2).join(",")).to.equal("3,2");

        doTransaction(()=>{
            arr.sort();
        });

        expect(arr.slice(0, 2).join(",")).to.equal("1,2");
        callback.expectComplete();
    })

});
