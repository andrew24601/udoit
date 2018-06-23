const {execSync} = require('child_process');

execSync("tsc");
execSync("tsc --p tsconfigcjs.json");
