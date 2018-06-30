const { DoContext, observable, computed, TransactionError, doTransaction, ObservableArray } = require('../distcjs/index');
const { expect } = require('chai');

function makeSimpleModel() {
    const model = {
        firstName: "First",
        lastName: "Last",
    }
    observable(model, "firstName")
    observable(model, "lastName")
    return model;
}

function makeArrayModel() {
    const model = {
        firstName: "First",
        lastName: "Last",
        children: new ObservableArray()
    }
    observable(model, "firstName")
    observable(model, "lastName")
    return model;
}

describe('JSON tests', ()=>{
    it('simple model stringifies', () => {
        const model = makeSimpleModel();
        const strModel = JSON.stringify(model);
        expect(JSON.parse(strModel)).to.deep.equal({firstName: "First", lastName: "Last"});
    }),
    it('array model stringifies', () => {
        const model = makeArrayModel();
        const strModel = JSON.stringify(model);
        expect(JSON.parse(strModel)).to.deep.equal({firstName: "First", lastName: "Last", children: []});
    })
});
