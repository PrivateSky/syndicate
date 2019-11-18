const util = require('util');
const {EventEmitter} = require('events');

const PoolEvents = {
    RELEASED_WORKER: 'releasedWorker'
};

/** @param {PoolConfig&PoolConfigStorage} options */
function AbstractPool(options) {
    EventEmitter.call(this);

    let pool = [];

    /** @returns {Worker|null} */
    this.getAvailableWorker = function () {
        // find first free worker
        const freeWorkerIndex = pool.findIndex(el => !el.isWorking);

        let worker = null;

        // if no free worker is available, try creating one
        if (freeWorkerIndex === -1) {
            _createNewWorker();
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
        const freeWorkerIndex = pool.findIndex(el => el.worker === worker);

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
        pool = pool.filter(poolWorker => poolWorker.workerInstance === worker);
    };

    this.createNewWorker = function () {
        throw new Error('Not implemented! Overwrite this in subclass.');
    };

    const _createNewWorker = () => {
        if (pool.length >= options.maximumNumberOfWorkers) {
            return;
        }

        this.createNewWorker((err, newWorker) => {
            if (err) {
                return $$.err('Error creating a new worker', err);
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
