const AbstractPool = require('./AbstractPool');

/**
 * @param {PoolConfig&PoolConfigStorage} options
 * @mixes AbstractPool
 */
function PoolThreads(options) {
    const abstractPool = new AbstractPool(options);

    this.events = abstractPool.events;
    this.getAvailableWorker = abstractPool.getAvailableWorker;
    this.remoteWorker = abstractPool.removeWorker;
    this.returnWorker = abstractPool.returnWorker;

    this.createNewWorker = function (callback) {
        const {Worker} = require('worker_threads');

        const workerOptions = {
            cwd: options.workingDir,
            workerData: {
                constitutions: options.constitutions
            }
        };

        const newWorker = new Worker(options.bootScriptPath, workerOptions);

        callback(undefined, newWorker);
    }
}

module.exports = PoolThreads;
