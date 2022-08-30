const {PureVirtualFunctionCanNotImp} = require("./error");


function pureVirtualFunctionCheck(classInstance, superClass) {
    let keys = Object.getOwnPropertyNames(superClass.prototype).filter(item => {
        return "constructor" !== item
    })
    for (let key of keys) {
        if (!_pureVirtualFunctionCheck(classInstance, superClass, key)) {
            throw new PureVirtualFunctionCanNotImp(superClass.name + "." + key)
        }
    }
}

function _pureVirtualFunctionCheck(classInstance, superClass, functionName) {
    let n = 0
    // eslint-disable-next-line no-prototype-builtins
    while (classInstance instanceof superClass) {
        let keys = Object.getOwnPropertyNames(classInstance)
        if (keys.some(key => key === functionName)) {
            n++
        }
        classInstance = classInstance.__proto__
    }

    return !!n
}

module.exports = {
    pureVirtualFunctionCheck
}