const Queue = require('swarmutils').Queue;
const {Worker} = require('worker_threads');

/** @param pool {AbstractPool} */
function WorkerPool(pool) {

    const PoolEvents = pool.events;
    const taskQueue = new Queue();

    this.addTask = function (task, callback) {
        const worker = pool.getAvailableWorker();

        if (!worker) {
            taskQueue.push({task, callback});
            return false;
        }

        addWorkerListeners(worker, callback);

        worker.postMessage(task);
        return true;
    };

    pool.on(PoolEvents.RELEASED_WORKER, () => {
        if (taskQueue.isEmpty()) {
            return;
        }

        const nextTask = taskQueue.front();

        const taskWasAcceptedByAWorker = this.addTask(nextTask.task, nextTask.callback);

        if (taskWasAcceptedByAWorker) {
            taskQueue.pop();
        } else {
            // events are propagates synchronously as mentioned in documentation (https://nodejs.org/api/events.html#events_asynchronous_vs_synchronous)
            // this can only happen if the worker is not properly marked as "not working"
            $$.err(`This should never happen and it's most likely a bug`);
        }
    });

    /**
     * @param {Worker} worker
     * @param {function} callbackForListeners
     */
    function addWorkerListeners(worker, callbackForListeners) {

        function callbackWrapper(...args) {
            callbackForListeners(...args);
            removeListeners();
            pool.returnWorker(worker);
        }

        function onMessage(...args) {
            if (args[0] instanceof Error) {
                callbackWrapper(...args);
            } else {
                callbackWrapper(undefined, ...args);
            }
        }

        function onError(err) {
            pool.removeWorker(worker);
            callbackWrapper(err);
        }

        function onExit(code) {
            pool.removeWorker(worker);
            if (code !== 0) {
                callbackWrapper(new Error('Operation could not be successfully executed'));
            }
        }

        worker.once('message', onMessage);
        worker.once('error', onError);
        worker.once('exit', onExit);

        function removeListeners() {
            worker.removeListener('message', onMessage);
            worker.removeListener('error', onError);
            worker.removeListener('exit', onExit);
        }
    }
}

module.exports = WorkerPool;
