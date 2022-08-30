class ApiError
    extends Error {

    constructor(message) {
        super(message);
    }

}

class TypeCheckError extends ApiError {
    constructor(message = "类型检测错误") {
        super(message);
    }
}

class PureVirtualFunctionCanNotImp extends ApiError {
    constructor(functionName = "") {
        super((functionName ? `"${functionName}"` : "") + " 纯虚函数没有实现");
    }
}

module.exports = {
    ApiError,
    TypeCheckError,
    PureVirtualFunctionCanNotImp
}