const {Father} = require("./father");

class Son extends Father {
    constructor() {
        super();
    }

    display() {
        super.display();
        console.log("son")
    }
}

module.exports = {
    Son
}