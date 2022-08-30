const {pureVirtualFunctionCheck} = require("./pureVirtualFunctionCheck");

class Father {
    constructor() {
        pureVirtualFunctionCheck(this, Father)
    }

    display() {
        console.log("father")
    }
}

module.exports = {
    Father
}