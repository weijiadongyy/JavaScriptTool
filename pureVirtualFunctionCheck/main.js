const {Son} = require("./son");
const {Father} = require("./father");
const {TypeCheckError} = require("./error");


const son = new Son()

son.display()


function display(peopleClass) {
    if (!Father.isPrototypeOf(peopleClass)) {
        throw new TypeCheckError()
    }

    const people = new peopleClass()
    people.display()
}

display(Father)
display(Son)
display(Number)