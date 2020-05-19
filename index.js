const PoolConfig = require('./lib/PoolConfig');
const WorkerPool = require('./lib/WorkerPool');
const WorkerStrategies = require('./lib/WorkerStrategies');

let registry = {};
function registerWorkerStrategy(strategyName, constructor){
    registry[strategyName] = constructor;
}

function getWorkerStrategy(strategyName){
    return registry[strategyName];
}

/**
 * @throws if config is invalid, if config tries to set properties to undefined or add new properties (check PoolConfig to see solutions)
 * @throws if providing a working dir that does not exist, the directory should be created externally
 * @throws if trying to use a strategy that does not exist
 */
function createWorkerPool(poolConfig, workerCreateHelper) {
    const newPoolConfig = PoolConfig.createByOverwritingDefaults(poolConfig);
    /*
    TODO: why do we need to check this here? :-??

    const fs = require('fs');
    const path = require('path');
    if (newPoolConfig.workerOptions && newPoolConfig.workerOptions.cwd && !fs.existsSync(newPoolConfig.workerOptions.cwd)) {
        throw new Error(`The provided working directory does not exists ${config.workingDir}`);
    }*/

    let workerStrategy = getWorkerStrategy(newPoolConfig.workerStrategy);
    if(typeof workerStrategy === "undefined"){
        throw new TypeError(`Could not find a implementation for worker strategy "${newPoolConfig.workerStrategy}"`);
    }

    let concretePool = new workerStrategy(newPoolConfig, workerCreateHelper);

    return new WorkerPool(concretePool);
}

const PoolIsolates = require('./lib/Pool-Isolates');
registerWorkerStrategy(WorkerStrategies.ISOLATES, PoolIsolates);

const PoolThreads = require('./lib/Pool-Threads');
registerWorkerStrategy(WorkerStrategies.THREADS, PoolThreads);

const PoolWebWorkers = require('./lib/Pool-Web-Workers');
registerWorkerStrategy(WorkerStrategies.WEB_WORKERS, PoolWebWorkers);

module.exports = {
    createWorkerPool,
    PoolConfig,
    WorkerStrategies,
    registerWorkerStrategy
};
