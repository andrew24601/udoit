const {execSync} = require('child_process');

execSync("tsc");
execSync("tsc --p tsconfigcjs.json");
execSync("tsc --experimentalDecorators true --target ES6 --moduleResolution node --module CommonJS test/tstest.ts");
