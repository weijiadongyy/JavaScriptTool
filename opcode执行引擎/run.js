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
            "display": this.display,
            "jz": this.jz,
            "jmp": this.jmp,
            "add": this.add,
            "mov": this.mov,
            "function": this.setFun
        };
    }

    async setFun([key, value]) {
        this.fun[key] = eval(value);

    }

    async add([key, value]) {
        this[key] += value;
    }

    async mov([key, value]) {
        this[key] = value;
    }

    async jmp([offset]) {
        this.eip += offset;
    }

    async jz([lamba, offset], paramArr) {
        lamba = eval(lamba);
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

    async display([data]) {
        console.log(eval(data));
    }

    async exit() {
        this.forcedBreak = true;
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
                return eval(item);
            }
            return item;
        });
    }

    getOneOpCode() {
        const opCode = this.opCode[this.eip];
        if (!opCode) {
            throw new Error("UnKonw Error");
        }
        return opCode;
    }

    async run() {
        this.init();
        while (1) {
            const opCode = this.getOneOpCode();
            // console.log(opCode);
            try {
                await this.handler[opCode.type].call(this, opCode.param, opCode.param2);
            } catch (e) {
                this.lastError = e;
                console.log(this.lastError);
                if (opCode.stop) {
                    this.forcedBreak = true;
                }
            }
            this.eip += 1;
            //强制结束
            if (this.forcedBreak) {
                break;
            }


        }
    }
}

/**
 *  内置函数
 */
class Inline {
    static async _add(a, b) {
        this.eax = a + b;
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
        type: "display",
        param: ["答案是:`${this.eax}`"],
    },
    {
        type: "jz",
        param: ["(a)=>!!(a[0]%2)", 2],
        param2: ["`${this.eax}`"],
    },
    {
        type: "display",
        param: ["`${this.eax}是偶数`"],
    },
    {
        type: "jmp",
        param: [1],
    },
    {
        type: "display",
        param: ["`${this.eax}是奇数`"],
    },
    {
        type: "mov",
        param: ["edx", 0]
    },
    {
        type: "call",
        param: ["_add"],
        param2: ["this.eax", 1],
    },
    {
        type: "add",
        param: ["edx", 1]
    },
    {
        type: "jz",
        param: ["(a)=>a[0]<10", -3],
        param2: ["this.edx"],
    },
    {
        type: "display",
        param: ["`结果是${this.eax}`"],
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
