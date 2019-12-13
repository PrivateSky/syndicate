
/** @param pool {AbstractPool} */
function WorkerPool(pool) {
    const {assert} = require('./utils');
    let Queue;

    try {
        Queue = require('swarmutils').Queue;
    } catch (e) {
        Queue = require('./QueueShim.js');
    }

    const PoolEvents = pool.events;
    const taskQueue = new Queue();

    this.addTask = function (task, callback) {
        const taskAccepted = this.runTaskImmediately(task, callback);

        if (!taskAccepted) {
            taskQueue.push({task, callback});
            return false;
        }

        return true;
    };

    /**
     * Tries to run task if a worker is available, if it is not it will simply discard the task
     * @returns {boolean} - True if the task was given to a worker, false if no worker was available for this task
     */
    this.runTaskImmediately = function (task, callback) {
        const worker = pool.getAvailableWorker();

        if (!worker) {
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

        const taskSize = taskQueue.length;
        const nextTask = taskQueue.front();

        const taskWasAcceptedByAWorker = this.runTaskImmediately(nextTask.task, nextTask.callback);

        if (taskWasAcceptedByAWorker) {
            taskQueue.pop();
            const newTaskSize = taskQueue.length;
            assert(newTaskSize === taskSize - 1, {ifFails: `The task queue size did not decrease, expected to be ${taskSize - 1} but is ${newTaskSize}`})
        } else {
            const newTaskSize = taskQueue.length;
            assert(newTaskSize === taskSize, {ifFails: `The task queue size modified when it shouldn't, expected to be equal but got pair (old: ${taskSize}, new: ${newTaskSize})`});
            // events are propagates synchronously as mentioned in documentation (https://nodejs.org/api/events.html#events_asynchronous_vs_synchronous)
            // one reason why this can happen is if the worker is not properly marked as "not working"
            // another one is that the queue contains a worker that is free but can't accept tasks (it might have been terminated)
            console.error(`This should never happen and it's most likely a bug`);
        }
    });

    /**
     * @param {Worker} worker
     * @param {function} callbackForListeners
     */
    function addWorkerListeners(worker, callbackForListeners) {

        function callbackWrapper(...args) {
            removeListeners();
            if(args[0] instanceof Error) {
                pool.removeWorker(worker);
            } else {
                pool.returnWorker(worker);
            }
            callbackForListeners(...args);
        }

        function onMessage(...args) {
            if (args[0] instanceof Error) {
                callbackWrapper(...args);
            } else {
                callbackWrapper(undefined, ...args);
            }
        }

        function onError(err) {
            callbackWrapper(err);
        }

        function onExit(code) {
            if (code !== 0) {
                callbackWrapper(new Error(`Worker exited unexpectedly with code ${code}`));
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
