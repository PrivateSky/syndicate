const fs = require('fs');
const path = require('path');
const PoolConfig = require('./lib/PoolConfig');
const WorkerPool = require('./lib/WorkerPool');
const WorkerStrategies = require('./lib/WorkerStrategies');

/**
 * @throws if config is invalid, if config tries to set properties to undefined or add new properties (check PoolConfig to see solutions)
 * @throws if providing a working dir that does not exist, the directory should be created externally
 * @throws if trying to use a strategy that does not exist
 */
function createWorkerPool(poolConfig) {
    const newPoolConfig = PoolConfig.createByOverwritingDefaults(poolConfig);

    if (!fs.existsSync(poolConfig.workingDir)) {
        throw new Error(`The provided working directory does not exists ${config.workingDir}`);
    }

    let concretePool = null;

    if (newPoolConfig.workerStrategy === WorkerStrategies.THREADS) {
        const PoolThreads = require('./lib/Pool-Threads');

        concretePool = new PoolThreads(newPoolConfig);
    } else if (newPoolConfig.workerStrategy === WorkerStrategies.ISOLATES) {
        const PoolIsolates = require('./lib/Pool-Isolates');

        concretePool = new PoolIsolates(newPoolConfig)
    } else {
        throw new TypeError(`Could not find a implementation for worker strategy "${newPoolConfig.workerStrategy}"`);
    }

    return new WorkerPool(concretePool);
}

function getDefaultBootScriptPath(workerStrategy) {

    let absolutePath = '';

    if(workerStrategy === WorkerStrategies.THREADS) {
        const relativePath = './lib/defaultBootScripts/ThreadBootScript.js';
        absolutePath = path.join(__dirname, relativePath);
    } else if (workerStrategy === WorkerStrategies.ISOLATES) {
        const relativePath = './lib/defaultBootScripts/IsolatesBootScript.js';
        absolutePath = path.join(__dirname, relativePath);
    } else {
        throw new TypeError(`Could not match provided strategy ${workerStrategy}, expected on of ${WorkerStrategies}`);
    }

    return absolutePath;
}

module.exports = {
    createWorkerPool,
    getDefaultBootScriptPath,
    PoolConfig: PoolConfig
};
