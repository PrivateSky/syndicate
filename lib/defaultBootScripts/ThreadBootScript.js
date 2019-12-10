function boot() {
    const {parentPort, workerData} = require('worker_threads');

    process.on("uncaughtException", (err) => {
        console.error('unchaughtException inside worker', err);
        setTimeout(() => {
            process.exit(1);
        }, 100);
    });

    if (!workerData.hasOwnProperty('constitutions')) {
        throw new Error(`Did not receive the correct configuration in worker data ${JSON.stringify(workerData)}`);
    }

    const firstConstitution = workerData.constitutions.shift();
    require(firstConstitution);
    const swarmEngine = require('swarm-engine');

    swarmEngine.initialise(process.env.IDENTITY);
    const powerCord = new swarmEngine.InnerThreadPowerCord();

    $$.swarmEngine.plug($$.swarmEngine.WILD_CARD_IDENTITY, powerCord);

    for (const constitution of workerData.constitutions) {
        require(constitution);
    }


    parentPort.on('message', (packedSwarm) => {
        console.log('got swarm');
        powerCord.transfer(packedSwarm);
    });

    parentPort.postMessage('ready');
}

module.exports = boot.toString();
