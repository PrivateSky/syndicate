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

for (const constitution of workerData.constitutions) {
    require(constitution);
}

const swarmUtils = require("swarmutils");
const beesHealer = swarmUtils.beesHealer;
const SwarmPacker = swarmUtils.SwarmPacker;

parentPort.on('message', (packedSwarm) => {
    let swarm = null;
    try {
        swarm = SwarmPacker.unpack(packedSwarm);
    } catch (e) {
        parentPort.postMessage(e); // treat this error
        return;
    }

    global.$$.swarmEngine.revive_swarm(swarm);
});


$$.PSK_PubSub.subscribe($$.CONSTANTS.SWARM_FOR_EXECUTION, function (swarm) {
    const newSwarm = beesHealer.asJSON(swarm, swarm.getMeta('phaseName'), swarm.getMeta('args'));
    const packedSwarm = SwarmPacker.pack(newSwarm);

    parentPort.postMessage(packedSwarm);
});

parentPort.postMessage('ready');
