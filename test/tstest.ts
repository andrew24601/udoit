import { DoContext, observable, TransactionError, doTransaction, ObservableArray } from '../distcjs/index';
import { expect } from 'chai';
import 'mocha';

class SimpleModel {
    @observable
    firstName = "First"

    @observable
    lastName = "Last"
}

class ComputedModel {
    _computeCount = 0

    @observable
    firstName = "First"
    @observable
    lastName = "Last"

    get fullName() {
        this._computeCount++;
        return this.firstName + " " + this.lastName;
    }

}

function makeSimpledModel() {
    let model;
    doTransaction(()=>{
        model = new SimpleModel();
    })
    return model;
}

function makeComputedModel() {
    let model;
    doTransaction(()=>{
        model = new ComputedModel();
    })
    return model;
}

describe('Typescript simple model test', ()=>{
    it('construct simple model', () => {
        const model = makeSimpledModel();

        expect(model.firstName).to.equal("First");
        expect(model.lastName).to.equal("Last");

        expect(()=>{model.firstName = "Bob"}).to.throw(TransactionError)
    }),
    it("writing to property outside transaction should fail", () => {
        const model = makeSimpledModel();

        expect(()=>{model.firstName = "Bob"}).to.throw(TransactionError)
        expect(()=>{model.lastName = "Surname"}).to.throw(TransactionError)
    }),
    it("writing to property inside transaction should succeed", () => {
        const model = makeSimpledModel();

        doTransaction(()=>{
            model.firstName = "Bob";
            model.lastName = "Surname";
        });

        expect(model.firstName).to.equal("Bob");
        expect(model.lastName).to.equal("Surname");
    })
});

describe("Typescript computed model test", ()=>{
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
