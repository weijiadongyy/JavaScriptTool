/**
 *   执行引擎
 */
class Run {
    constructor(opCode) {
        this.opCode = opCode;
        this.eip = 0;
        this.eax = 0;
        this.ebx = 0;
        this.ecx = 0;
        this.edx = 0;
        this.lastError = null;
        this.forcedBreak = false;
        this.stack = [];
        this.fun = {};
        this.handler = {
            "exit": this.exit,
            "call": this.call,
            "jz": this.jz,
            "jmp": this.jmp,
            "add": this.add,
            "sub": this.sub,
            "mov": this.mov,
            "function": this.setFun,
        };
    }

    async setFun([key, value]) {
        this.fun[key] = this.eval(value);

    }

    async add([key, value]) {
        this[key] += value;
    }

    async sub([key, value]) {
        this[key] -= value;
    }

    async mov([key, value]) {
        this[key] = value;
    }

    async jmp([offset]) {
        this.eip += offset;
    }

    async jz([lamba, offset], paramArr) {
        lamba = this.eval(lamba);
        if (lamba(this.applyEvalParam(paramArr))) {
            await this.jmp([offset]);
        }
    }

    async call([funName], paramArr) {
        if (Inline[funName]) {
            await Inline[funName].apply(this, this.applyEvalParam(paramArr));
        } else if (this.fun[funName]) {
            await this.fun[funName].apply(this, this.applyEvalParam(paramArr));
        } else {
            throw new Error("函数不存在");
        }

    }



    async exit() {
        this.forcedBreak = true;
    }

    eval(code) {
        try {
            return eval(code);
        } catch (e) {
            throw new Error("eval faild, your code is \n" + code + "\n error message is " + e.message);
        }
    }

    init() {
        this.eax = 0;
        this.ebx = 0;
        this.ecx = 0;
        this.edx = 0;
        this.eip = 0;
        this.stack = [];
        this.forcedBreak = false;
        this.lastError = null;
        this.fun = {};
    }

    applyEvalParam(arr) {
        if (!Array.isArray(arr)) {
            return arr;
        }
        return arr.map(item => {
            if ("string" === typeof item) {
                return this.eval(item);
            }
            return item;
        });
    }

    getOneOpCode() {
        const opCode = this.opCode[this.eip];
        if (!opCode) {
            throw new Error("无指令可取");
        }
        return opCode;
    }

    async run() {
        this.init();
        while (1) {
            const opCode = this.getOneOpCode();
            try {
                await this.handler[opCode.type].call(this, opCode.param, opCode.param2);
            } catch (e) {
                this.lastError = e;
                console.log(this.lastError);
                if (opCode.stop) {
                    this.forcedBreak = true;
                }
                if (opCode.errorHandler) {
                    opCode.errorHandler.call(this, this.lastError);
                }
            }
            this.eip += 1;

            if (this.forcedBreak) {
                break;
            }


        }
    }
}

/**
 *  内置函数 如aes
 */
class Inline {
    static async _add(a, b) {
        this.eax = a + b;
    }

    static async _display(data) {
        console.log(data);
    }

    constructor() {
    }
}


const run = new Run([
    {
        type: "function",
        param: ["my_fun", `(function () {
                                return function (data) {
                                    console.error("嘎嘎嘎嘎 " + this.eax);
                                };
                            })();`]
    },
    {
        type: "call",
        param: ["_add"],
        param2: [3, 5],
    },
    {
        type: "call",
        param: ["_display"],
        param2: ["答案是:`${this.eax}`"],
    },
    {
        type: "jz",
        param: ["(a)=>!!(a[0]%2)", 2],
        param2: ["this.eax"],
    },
    {
        type: "call",
        param: ["_display"],
        param2: ["`${this.eax}是偶数`"],
    },
    {
        type: "jmp",
        param: [1],
    },
    {
        type: "call",
        param: ["_display"],
        param2: ["`${this.eax}是奇数`"],
    },
    {
        type: "mov",
        param: ["ecx", 10]
    },
    {
        type: "call",
        param: ["_add"],
        param2: ["this.eax", 1],
    },
    {
        type: "sub",
        param: ["ecx", 1]
    },
    {
        type: "jz",
        param: ["(a=>a[0]>0)", -3],
        param2: ["this.ecx"],
        stop: true
    },
    {
        type: "call",
        param: ["_display"],
        param2: ["`结果是${this.eax}`"],
    },
    {
        type: "call",
        param: ["my_fun"],
    },
    {
        type: "exit",
        param: [],
    }
]);

run.run();
