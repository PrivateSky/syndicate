const os = require('os');
const util = require('util');
const WorkerStrategies = require('./WorkerStrategies');

function PoolConfigStorage() {
    this.bootScriptPath = '.';
    this.constitutions = [];
    this.maximumNumberOfWorkers = os.cpus().length;
    this.workerStrategy = WorkerStrategies.THREADS;
    this.workingDir = '.';
}

/**
 * This just provides validation for properties on config
 * Substituting this class to PoolConfigStorage should behave exactly the same if the config is valid
 * @constructor
 */
function PoolConfig() {
    const storage = new PoolConfigStorage();

    return {
        get bootScriptPath() {
            return storage.bootScriptPath;
        },
        set bootScriptPath(value) {
            // check if file is url
            storage.bootScriptPath = value;
        },

        get constitutions() {
            return storage.constitutions;
        },
        set constitutions(value) {
            if (!Array.isArray(value)) {
                throw new TypeError('constitutions is expected to be an array, tried changing it to ' + typeof value);
            }

            storage.constitutions = value;
        },

        get maximumNumberOfWorkers() {
            return storage.maximumNumberOfWorkers;
        },
        set maximumNumberOfWorkers(value) {
            if (!Number.isFinite(value)) {
                throw new TypeError(`Attribute maximumNumberOfWorkers should be a finite number, got ${typeof value}`);
            }

            if (value <= 0) {
                throw new RangeError(`Attribute maximumNumberOfWorkers should have a value bigger than 0, got ${value}`);
            }

            storage.maximumNumberOfWorkers = value;
        },

        get workerStrategy() {
            return storage.workerStrategy
        },
        set workerStrategy(value) {
            if (!Object.values(WorkerStrategies).includes(value)) {
                throw new TypeError(`Value ${value} not allowed for workerStrategy attribute`);
            }

            return storage.workerStrategy;
        },

        get workingDir() {
            return storage.workingDir;
        },
        set workingDir(value) {
            // check if file is url
            storage.workingDir = value;
        },

        toJSON: function () {
            return JSON.stringify(storage);
        },
        [Symbol.toStringTag]: function () {
            return storage.toString()
        },
        [util.inspect.custom]: function () {
            return util.inspect(storage, {colors: true});
        }
    }
}

/**
 * This utility merges a new config to a default one. It is easier to use if you want to overwrite only a subset
 * of properties of the config.
 * @returns {PoolConfig&PoolConfigStorage}
 */
PoolConfig.createByOverwritingDefaults = function (config, options = {allowNewKeys: false, allowUndefined: false}) {
    const defaultConfig = new PoolConfig();

    Object.keys(config).forEach(key => {

        if (!options.allowNewKeys && !defaultConfig.hasOwnProperty(key)) {
            throw new Error(`Tried overwriting property ${key} that does not exist on PoolConfig. ` +
                `If this is intentional, set in options argument "allowNewKeys" to true'`);
        }

        if (!options.allowUndefined && typeof config[key] === 'undefined') {
            throw new Error(`Tried setting value of ${key} to undefined. ` +
                'If this is intentional, set in options argument "allowUndefined" to true');
        }

        defaultConfig[key] = config[key];
    });

    return defaultConfig;
};

module.exports = PoolConfig;