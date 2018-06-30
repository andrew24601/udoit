"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../distcjs/index");
const chai_1 = require("chai");
require("mocha");
class SimpleModel {
    constructor() {
        this.firstName = "First";
        this.lastName = "Last";
    }
}
__decorate([
    index_1.observable
], SimpleModel.prototype, "firstName", void 0);
__decorate([
    index_1.observable
], SimpleModel.prototype, "lastName", void 0);
class ComputedModel {
    constructor() {
        this._computeCount = 0;
        this.firstName = "First";
        this.lastName = "Last";
    }
    get fullName() {
        this._computeCount++;
        return this.firstName + " " + this.lastName;
    }
}
__decorate([
    index_1.observable
], ComputedModel.prototype, "firstName", void 0);
__decorate([
    index_1.observable
], ComputedModel.prototype, "lastName", void 0);
__decorate([
    index_1.computed
], ComputedModel.prototype, "fullName", null);
function makeSimpledModel() {
    let model;
    index_1.doTransaction(() => {
        model = new SimpleModel();
    });
    return model;
}
function makeComputedModel() {
    let model;
    index_1.doTransaction(() => {
        model = new ComputedModel();
    });
    return model;
}
describe('Typescript simple model test', () => {
    it('construct simple model', () => {
        const model = makeSimpledModel();
        chai_1.expect(model.firstName).to.equal("First");
        chai_1.expect(model.lastName).to.equal("Last");
        chai_1.expect(() => { model.firstName = "Bob"; }).to.throw(index_1.TransactionError);
    }),
        it("writing to property outside transaction should fail", () => {
            const model = makeSimpledModel();
            chai_1.expect(() => { model.firstName = "Bob"; }).to.throw(index_1.TransactionError);
            chai_1.expect(() => { model.lastName = "Surname"; }).to.throw(index_1.TransactionError);
        }),
        it("writing to property inside transaction should succeed", () => {
            const model = makeSimpledModel();
            index_1.doTransaction(() => {
                model.firstName = "Bob";
                model.lastName = "Surname";
            });
            chai_1.expect(model.firstName).to.equal("Bob");
            chai_1.expect(model.lastName).to.equal("Surname");
        });
});
describe("Typescript computed model test", () => {
    it('construct computed model', () => {
        const model = makeComputedModel();
        chai_1.expect(model.firstName).to.equal("First");
        chai_1.expect(model.lastName).to.equal("Last");
        chai_1.expect(model.fullName).to.equal("First Last");
    }),
        it('update computed model', () => {
            const model = makeComputedModel();
            chai_1.expect(model.firstName).to.equal("First");
            chai_1.expect(model.lastName).to.equal("Last");
            chai_1.expect(model.fullName).to.equal("First Last");
            index_1.doTransaction(() => {
                model.firstName = "Bob";
            });
            chai_1.expect(model.fullName).to.equal("Bob Last");
        });
});
