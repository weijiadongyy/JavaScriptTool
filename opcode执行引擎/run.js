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
        this.heap = {};
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
        if ("string" == typeof offset) {
            const idIndex = this.findIdIndex(offset)
            if (-1 === idIndex) {
                throw new Error("找不到跳转地方, offset is" + offset);
            }
            offset = idIndex - this.eip - 1;
        }

        if ("number" === typeof offset) {
            this.eip += offset;
        } else {
            throw new Error("参数错误, offset is" + JSON.stringify(offset));
        }

    }

    async jz([lambada, offset], paramArr) {
        lambada = this.eval(lambada);
        if (lambada(this.applyEvalParam(paramArr))) {
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
            throw new Error("eval failed, your code is \n" + code + "\n error message is " + e.message);
        }
    }

    findIdIndex(id) {
        if (!this.cache.idIndex) {
            this.cache.idIndex = {};
        }
        if (this.cache.idIndex[id]) {
            return this.cache.idIndex[id];
        }
        const index = this.opCode.findIndex(item => item.id === id);
        this.cache.idIndex[id] = index;
        return index;
    }

    init() {
        this.eax = 0;
        this.ebx = 0;
        this.ecx = 0;
        this.edx = 0;
        this.eip = 0;
        this.stack = [];
        this.heap = {};
        this.cache = {};
        this.forcedBreak = false;
        this.lastError = null;
        this.fun = {};
        this.cache = {};
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
        // eslint-disable-next-line no-constant-condition
        while (1) {
            const opCode = this.getOneOpCode();
            try {
                await this.handler[opCode.type].call(this, opCode.param, opCode.param2);
            } catch (e) {
                this.lastError = e;
                console.log(this.lastError);
                if (!(opCode.stop === false)) {
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
        this.heap._add = {
            a,
            b,
            result: this.eax
        };
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
        param: ["my_fun", `()=>{
            console.log(this.stack, this.heap)
        }`]
    },
    {
        type: "call",
        param: ["_add"],
        param2: [3, 6],
    },
    {
        type: "call",
        param: ["_display"],
        param2: ["答案是:`${this.eax}`"],
    },
    {
        type: "jz",
        param: ["(a)=>!!(a[0]%2)", "displayEven"],
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
        id: "displayEven",
        type: "call",
        param: ["_display"],
        param2: ["`${this.eax}是奇数`"],
    },
    {
        type: "mov",
        param: ["ecx", 10]
    },
    {
        id: "addStart",
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
        param: ["(a=>a[0]>0)", "addStart"],
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
