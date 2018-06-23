const { DoContext, observable, TransactionError, doTransaction, ObservableArray } = require('../distcjs/index');
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

describe('Observable array test', ()=>{
    it("creating observable array", ()=>{
        const arr = new ObservableArray();
        expect(arr.length).to.equal(0);
    }),
    it("writing to observable array outside transaction should fail", ()=>{
        const arr = new ObservableArray();
        expect(()=>{arr.push(1)}).to.throw(TransactionError);
    }),
    it("updating observable array in transaction should succeed", ()=>{
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
    it("using do should update after transaction completes", () => {
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
    })
});
