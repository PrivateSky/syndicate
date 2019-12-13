const syndicate = require('../index');

const {isMainThread} = require('worker_threads');

if (isMainThread) {

    const workerPool = syndicate.createWorkerPool({
        bootScript: __filename
    });

    workerPool.addTask('hello from parent', (err, result) => {
        console.log(result); // prints "hello from worker"
    });

} else {
    const {parentPort} = require('worker_threads');

    parentPort.on('message', (msg) => {
        console.log(msg); // prints "hello from parent"
        parentPort.postMessage('hello from worker');
    });

    parentPort.postMessage('ready');
}

