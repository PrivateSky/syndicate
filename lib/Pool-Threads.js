const AbstractPool = require('./AbstractPool');

/**
 * @param {PoolConfig&PoolConfigStorage} options
 * @mixes AbstractPool
 */
function PoolThreads(options) {
    AbstractPool.call(this, options);

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

util.inherits(PoolThreads, AbstractPool);

module.exports = PoolThreads;
