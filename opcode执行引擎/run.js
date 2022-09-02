const fs = require("fs")
class Channel {
    static EVENT_NAME = {
        "RUN": "RUN"
    }
    constructor(eventName) {
        this.channel = require('diagnostic-channel').channel;
        this.eventName = eventName;
        this.cb = null;
        this.resolve = null;
    }

    _read(event) {
        if (!this.resolve) {
            return event.data
        }
        const resolve = this.resolve
        resolve(event.data)
        this.resolve = null

    }

    publish(data) {
        this.channel.publish(this.eventName, data)
    }

    subscribe(mycb) {
        this.cb = (function (event) {
            if (mycb) {
                mycb(event)
                return;
            }
            if (!this.resolve) {
                return;
            }
            const resolve = this.resolve
            resolve(event.data)
            this.resolve = null
        }).bind(this)
        this.channel.subscribe(this.eventName, this.cb);
    }

    unsubscribe() {
        // console.log(this.cb)
        this.channel.unsubscribe(this.eventName, this.cb)
    }

    read() {
        const self = this
        return new Promise(resolve => {
            self.resolve = resolve
        })
    }


}

/**
 *   执行引擎
 */
class Run {
    constructor(opCode) {
        this.opCode = opCode;
        fs.writeFileSync("./run.json", JSON.stringify(this.opCode))
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

        this.message = new Channel(Channel.EVENT_NAME.RUN)

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
            await (this.fun[funName]).apply(this, this.applyEvalParam(paramArr));
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

    loop(fn, t) {
        const id = setInterval(fn, t)
        if(!this.cache.interval) {
            this.cache.interval = []
        }
        this.cache.interval.push(id)
        return id
    }

    exitProcess() {
        if(this.cache.interval) {
            this.cache.interval.forEach(item=>{
                clearInterval(item)
            })
        }
        this.message.publish("exitProcess")
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

    run() {
        return new Promise((resolve, reject) => {
            this.message.subscribe((event)=>{
                switch (event.data){
                    case "exitProcess":
                        this.init()
                        reject("exitProcess")
                }
            })
            this._run().then(()=>resolve()).catch(err=>reject(err))
        })
    }

    async _run() {

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
        param: ["my_fun", `async ()=> {
            this.loop(() => {
                console.log(this.stack, this.heap);
            },1000)
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
        param2: ["`答案是:${this.eax}`"],
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

run.run().catch(e=>{
    console.log(e);
})

setTimeout(function (){
    run.exitProcess()
},3100)


/**
 * 关于exitProcess
 * 直接reject 无法结束正在执行的内部函数，如 a函数调用b函数，b函数await axios，然后做一些操作c
 * 如果a直接reject确实执行引擎会被强制停止，但是b函数还是会继续执行。
 * 之前只是针对setTimeout这种宏任务做了清理，如果要结束所有promise，则需要实现给promiese的参数加扩展
 * 使得每个promise在获取到消息之后全部reject
 * return new Promise((resolve, reject) => {}) 改成
 * function promiseFn(resolve, reject) {}
 * return new Promise(this.promiseFn.bind(this))
 * 这样做是为了方便给函数加上注解来统一注入代码 比如
 * function promise() {
 *     return function decorator(target, name, descriptor) {
 *         const value = descriptor?.value;
 *         if ("function" !== typeof value) {
 *             return;
 *         }
 *
 *         async function overWriteValue(...args) {
 *             console.log(`promise log:执行方法${name};参数为`, args);
 *             setTimeout(() => {
 *                 console.log(`promise log:准备结束方法${name}`);
 *                 args[1]("走你")
 *             }, 2000)
 *
 *             return await value.bind(this)(...args);
 *         }
 *
 *         return {
 *             ...descriptor,
 *             value: overWriteValue
 *         };
 *     };
 * }
 *
 * 为啥写到注释，是因为node原生并不支持注解，需要babel或者直接使用ts进行编译才能运行
 */