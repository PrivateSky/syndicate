const AbstractPool = require('./AbstractPool');
const util = require('util');
/**
 * @param {PoolConfig&PoolConfigStorage} options
 * @mixes AbstractPool
 */
function PoolIsolates(options) {
    AbstractPool.call(this, options);

    this.createNewWorker = function (callback) {
        const workerOptions = options.workerOptions;

        const getIsolatesWorker = require('./defaultBootScripts/IsolatesBootScript');

        getIsolatesWorker(workerOptions)
            .then((newWorker) => {
                callback(undefined, newWorker)
            })
            .catch(err => {
                callback(err);
            });
    };

}

util.inherits(PoolIsolates, AbstractPool);

module.exports = PoolIsolates;
