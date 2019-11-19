const AbstractPool = require('./AbstractPool');

/**
 * @param {PoolConfig&PoolConfigStorage} options
 * @mixes AbstractPool
 */
function PoolIsolates(options) {
    const abstractPool = new AbstractPool(options);

    this.events = abstractPool.events;
    this.getAvailableWorker = abstractPool.getAvailableWorker;
    this.remoteWorker = abstractPool.removeWorker;
    this.returnWorker = abstractPool.returnWorker;

    this.createNewWorker = function (callback) {
        if(options.constitutions.length < 1) {
            return callback(new Error('You need to provide at least one constitution'))
        }

        const workerOptions = {
            shimsBundle: options.constitutions[0],
            constitution: options.constitutions.slice(1)
        };

        const getIsolatesWorker = require(options.bootScriptPath);

        getIsolatesWorker(workerOptions)
            .then((newWorker) => {
                callback(undefined, newWorker)
            })
            .catch(err => {
                callback(err);
            });
    };

    abstractPool.createNewWorker = this.createNewWorker;

}

module.exports = PoolIsolates;
