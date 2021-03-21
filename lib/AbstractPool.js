const {assert} = require('./utils');
const util = require('util');
const {EventEmitter} = require('events');

const PoolEvents = {
    RELEASED_WORKER: 'releasedWorker'
};

/** @param {PoolConfig&PoolConfigStorage} options */
function AbstractPool(options) {
    EventEmitter.call(this);

    let pool = [];
    let currentPoolSize = 0;

    /** @returns {Worker|null} */
    this.getAvailableWorker = function () {
        // find first free worker
        const freeWorkerIndex = pool.findIndex(el => !el.isWorking);

        let worker = null;

        // if no free worker is available, try creating one
        if (freeWorkerIndex === -1) {
            _createNewWorker();
            return null;
        } else {
            worker = pool[freeWorkerIndex];
        }

        if (worker === null) {
            return null;
        }

        // if free worker exists, set its state to working
        worker.isWorking = true;
        return worker.workerInstance;
    };

    /** @param {Worker} worker */
    this.returnWorker = function (worker) {
        // find worker that matches one in the pool
        const freeWorkerIndex = pool.findIndex(el => el.workerInstance === worker);

        if (freeWorkerIndex === -1) {
            console.error('Tried to return a worker that is not owned by the pool');
            return;
        }

        // if worker is found, set its state to not working
        pool[freeWorkerIndex].isWorking = false;
        this.emit(PoolEvents.RELEASED_WORKER);
    };

    /** @param {Worker} worker */
    this.removeWorker = function (worker) {
        const localPoolSize = pool.length;

        pool = pool.filter(poolWorker => poolWorker.workerInstance !== worker); // keep elements that are not equal to worker
        currentPoolSize = pool.length;

        assert(currentPoolSize === localPoolSize - 1, {ifFails: `Tried returning a worker that could not be found`});
    };

    this.createNewWorker = function () {
        throw new Error('Not implemented! Overwrite this in subclass.');
    };

    const _createNewWorker = () => {
        // using currentPoolSize instead of pool.length because the creation of workers can be asynchronous
        // and the pool will increase only after the worker is creating, this can cause a situation where
        // more workers are created than the maximumNumberOfWorkers
        if (currentPoolSize >= options.maximumNumberOfWorkers) {
            return;
        }

        currentPoolSize += 1;

        this.createNewWorker((err, newWorker) => {
            if (err) {
                currentPoolSize -= 1;
                console.error('Error creating a new worker', err);
                return;
            }

            const workerObj = {
                isWorking: false,
                workerInstance: newWorker
            };

            pool.push(workerObj);

            // createNewWorker can be synchronous (even though it uses a callback),
            // in that case it will cause scheduling problems if not delayed
            setImmediate(() => {
                this.emit(PoolEvents.RELEASED_WORKER);
            });
        });
    };

}

util.inherits(AbstractPool, EventEmitter);
AbstractPool.prototype.events = PoolEvents;


module.exports = AbstractPool;
