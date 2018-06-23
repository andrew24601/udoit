[![Build Status](https://travis-ci.org/andrew24601/udoit.svg?branch=master)](https://travis-ci.org/andrew24601/udoit)

# udoit
Tiny functional reactive state library

## Installation
```sh
npm install udoit --save
yarn add udoit
```

## Usage

### TypeScript
```typescript
import { observable, doTransaction, DoContext } from 'udoit';

class SimpleModel {
    @observable firstName: String;
    @observable lastName: String;
}

const model = new SimpleModel();

const ctx = new DoContext();

doTransaction(()=>{
    model.firstName = "Bob";
    model.lastName = "Surname";
});

ctx.do(()=>{
    console.log(model.firstName + " " + model.lastName);
});

doTransaction(()=>{
    model.firstName = "Mary";
});

```