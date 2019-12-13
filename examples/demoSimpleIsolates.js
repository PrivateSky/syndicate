const syndicate = require('../index');
const ivm = require('isolated-vm');
const {EventEmitter} = require('events');

async function createIsolate() {
    let isolate = new ivm.Isolate();
    let context = await isolate.createContext();

    class IsolatesWrapper extends EventEmitter {
        postMessage(task) {
            try {
                receiveWorkRef
                    .apply(undefined, [task]) // 6
                    .catch(err => this.emit('error', err));
            } catch (e) {
                this.emit('error', e);
            }
        }
    }

    const isolatesWrapper = new IsolatesWrapper();

    const returnReference = new ivm.Reference(function (...results) { // 1
        isolatesWrapper.emit('message', results);
    });

    await context.global.set('__return', returnReference); // 2

    const preparationScript = await isolate.compileScript(` 
        receiveWork = function(task) {
             // task is "hello from parent" here
            __return.apply(undefined, [task, "hello from worker"]);
        }
    `); // 3

    await preparationScript.run(context); // 4

    const receiveWorkRef = await context.global.get('receiveWork'); // 5

    return isolatesWrapper;
}


const workerPool = syndicate.createWorkerPool({
    bootScript: createIsolate,
    workerStrategy: syndicate.WorkerStrategies.ISOLATES
});

workerPool.addTask("hello from parent", (err, result) => {
    console.log(result); // prints ["hello from parent", "hello from worker"]
});

