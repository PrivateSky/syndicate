# Description
This module exposes an interface able to create pools of customizable native or secure workers.

# Quick start 

Here is an example of the quickest way to start and use a worker pool.
```js
const syndicate = require('syndicate');

const {isMainThread} = require('worker_threads');

if (isMainThread) {

    const workerPool = syndicate.createWorkerPool({
        bootScript: __filename
    });

    workerPool.addTask('hello from parent', (err, result) => {
        console.log(result); // prints "hello from worker"
    });

} else {
    const {parentPort} = require('worker_threads');

    parentPort.on('message', (msg) => {
        console.log(msg); // prints "hello from parent"
        parentPort.postMessage('hello from worker');
    });

    parentPort.postMessage('ready');
}
```

If you are familiar with the worker_threads APIs you will find this example very familiar. In its default implementation it uses worker_threads to instantiate the workers.

To start using syndicate with the defaults, you have to call "createWorkerPool" method providing an object with "bootScript" key specifying the path to the script that will run inside each worker. This will return a pool that exposes a single method, "addTask" that accepts any primitive type, and a callback that is called with the response sent by the "postMessage" inside the worker.

Theoretically, any script that can run normally inside a worker_thread will also run using syndicate, the only requirement is that the first message sent by a worker should be "ready" because some scripts need a preparation time (using asynchronous operations) before they're ready to execute tasks.

# Types of workers

1. The easiest type of worker is based on worker_threads. This is also the default worker. There are no restrictions applied to this type of worker, the only exception is that he first sent message must always be 'ready' as mentioned previously.

2. The other type of worker is called an "Isolate" because it's based on the module "isolated-vm". This provides a thread that runs only the JavaScript interpreter in a different Node.js context therefore completely isolating and limiting the capabilities of this type of worker in order to offer better security.

# How to configure Syndicate

When creating a WorkerPool object, a config object is passed to the "createWorkerPool" method. This object has the following configurable fields.

- bootScript: this is a script path in most cases, or it can be a string with the contents of the script (this works only for worker_threads and only by telling the worker threads to eval the string, see workerOptions to see how), or a function
- maximumNumberOfWorkers: 
    - this is an optional field, it takes an unsigned integer meaning the upper bound of the number of workers allowed to be created
    - workers will be created lazily, only when they are needed
    - the default value is equal to the number of cores present on the current machine
- workerStrategy:
    - this is either threads or isolates, but the syndicate module exposes these constants to help
    - the default value is set to threads
- workerOptions: 
    - these are the options that will be passed as is to the worker_threads module or to isolates to allow more customization 
    - for threads, the options can be seen [here](https://nodejs.org/api/worker_threads.html#worker_threads_new_worker_filename_options)
    - for example, set here "eval: true" if you want to provide a script as string in the "bootScript" fields instead of a path
    
This config option helps configure the worker before it is created, however you might need to customize it after it was created or simply want to obtain the instance.

For this reason, the "createWorkerPool" method accepts as the second parameter a function that will receive the worker instance before it is added to the pool. 

# How to use Syndicate with Isolates

The easiest way to get you started with an isolated environment that can support "require" and other functionality beside the simple interpreter provided by isolated-vm, is to use [PSKIsolates](https://github.com/PrivateSky/pskisolates)

However I present further what you need to do to create a simple implementation that works.

#### Basic Isolate implementation

```js
const syndicate = require('syndicate');
const ivm = require('isolated-vm');
const {EventEmitter} = require('events');

async function createIsolate(workerOptions) {
    let isolate = new ivm.Isolate();
    let context = await isolate.createContext();

    class IsolatesWrapper extends EventEmitter {
        postMessage(task) {
            try {
                isolate.compileScript(task)
                    .then(script => script.run(context))
                    .then(result => {
                        this.emit('message', result);
                    })
                    .catch(err => {
                        this.emit('error', err)
                    });
            } catch (e) {
                this.emit('error', e);
            }
        }
    }

    return new IsolatesWrapper();
}


const workerPool = syndicate.createWorkerPool({
    bootScript: createIsolate,
    workerStrategy: syndicate.WorkerStrategies.ISOLATES
});

workerPool.addTask('"hello from worker";', (err, result) => {
    console.log(result); // prints "hello from worker"
});

```

In order to create isolate workers, syndicate wants as bootScript a function that will receive "workerOptions" as arguments and returns using a promise something with the same API as a workerThread, meaning something that will listen on "postMessage" to receive tasks and that will emit on "message" the result or on "error" if something bad happened.

This function should instantiate an isolate and prepare a context for it (mostly meaning the global object avaiable inside the isolate). Each time the wrapper receives a "task", it "compiles" it and tries running it inside the isolate with the already existing object. 

This is important to consider because if a task pollutes the context, subsequent tasks will be affected. Different strategies can be applied here, the context can be created initially and customized but at each request the isolate will receive a clone of the context. This is more efficient then creating the context from zero, but it might have a significant impact in some situations.

This example is good to grasp what is happening but not helpful in practice because, even though it might not be obvious, but the isolates simply returns synchronously what we passed in and we have no way to avoid that with this approach. In order to solve this let's look at the next example.

#### Isolates implementation that allows for asynchronous work.

```js
const syndicate = require('syndicate');
const ivm = require('isolated-vm');
const {EventEmitter} = require('events');

async function createIsolate() {
    let isolate = new ivm.Isolate();
    let context = await isolate.createContext();

    class IsolatesWrapper extends EventEmitter {
        postMessage(task) {
            try {
                receiveWorkRef
                    .apply(undefined, [task]) // 6
                    .catch(err => this.emit('error', err));
            } catch (e) {
                this.emit('error', e);
            }
        }
    }

    const isolatesWrapper = new IsolatesWrapper();

    const returnReference = new ivm.Reference(function (...results) { // 1
        isolatesWrapper.emit('message', results);
    });

    await context.global.set('__return', returnReference); // 2

    const preparationScript = await isolate.compileScript(` 
        receiveWork = function(task) {
             // task is "hello from parent" here
            __return.apply(undefined, [task, "hello from worker"]);
        }
    `); // 3

    await preparationScript.run(context); // 4 

    const receiveWorkRef = await context.global.get('receiveWork'); // 5

    return isolatesWrapper;
}


const workerPool = syndicate.createWorkerPool({
    bootScript: createIsolate,
    workerStrategy: syndicate.WorkerStrategies.ISOLATES
});

workerPool.addTask("hello from parent", (err, result) => {
    console.log(result); // prints ["hello from parent", "hello from worker"]
});

```

The purpose of this example is to showcase how to call a specific function (maybe asynchronous) that exists inside an isolate, give it some work to do and receive the results back. 

The steps I'll explain correspond to the numbers in the comments at the end of significant lines

1. In order for the isolate to call a function outside its context we need to pass it a reference to a function owned by another isolate (the node.js environment is an isolate in and of itself). Here we define an anonymous function and get a reference to it.

2. In this step we assign to "global.__return" (the global object of the target isolate) the reference of the function aforementioned.

3. The isolate need a function inside itself that will handle the task. Now we simply send strings but you can send objects that will help this function decide what needs to be done with the received input. For now, the function "receiveWork" is on global and all it does is to call the "__return" function created previously with the value of "this" set to undefined, the received task and a message. The "__return" function must be called with "apply" because it's not a real function, it is actually a wrapper of type Reference that knows how to deal with calls and dereferencing (for more details go [here](https://github.com/laverdet/isolated-vm#class-reference-transferable))

4. Run the script written at step 3 to allow the modifications to take place inside the isolate.

5. Get a reference to the function created at step 3 to be able to call it from the main process.

6. As in the case of "__return", this function too has to be called with apply because it is a Reference.

At the end of running this, the main process will have a reference to "receiveWork" and the isolate will have a reference to "__return" function. This way the main process can send work to the isolate and the isolate can respond.
