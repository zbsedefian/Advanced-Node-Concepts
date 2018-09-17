# Understanding Node internals

Node runs on two dependencies: V8 (a google runtime which interprets and executes JS code) and libuv (a C++ wrapper that allows access to syscalls).

Node -> process.binding() which connects JS to C++ functions -> V8 converts JS to C++

# Node event loop

Node creates one thread when it's executed. Inside that thread is an event loop.
(see example in loop.js)

# Is node single threaded?

The event loop is. Some of the node framework and stdlib, however, is not single threaded.

For some functions (all fs (filesystem) module functions, some crypto, OS dependent) (see threads.js), Node's C++ side (libuv) creates a thread pool. In the case of my macbook processor (dual core), the maximum threads per processor is two. Meaning, five crypto() calls will allow for four of those five to execute concurrently. 

May change threadpool size

<pre>
process.env.UV_THREADPOOL_SIZE = 5;
</pre>

async.js gives an example of OS syscalls. For example, a network request on the http module is done by the OS. libuv delegates the work to the OS, so there is no blocking within the code.

# Strange behavior

multitask.js output:

<pre>
Http: 305
Hash: 2360 ms
FS: 2362
Hash: 2400 ms
Hash: 2441 ms
Hash: 2459 ms
</pre>

The FS readFile() call pauses twice. Node gets stats on the file, then file contents streamed to app. 

The order of console logs is because readFile() is assigned to thread 1, and the first three doHash() functions are assigned to threads 2-4. While node is waiting for fs, the fourth doHash() is assigned to thread 1. When thread 1 finished, thread 2 sees that the syscall readFile() still needs to be executed, so it comes out second.

# Improving node performance

Use Node in Cluster mode (multiple node instances), or use worker threads (experimental). 

The first instance that is created when you run index.js is called the Cluster Manager. The Cluster manager monitors the health of each single-threaded node server. The cluster module is part of the fs library. cluster.fork() goes back to index.js and executes it again, creating a worker instance.

See index_cluster.js for example.

Adding many additional children with cluster.fork() will have diminishing returns. You can test this with the benchmarking tool ab (apache benchmark).

However, cluster management is best done with the pm2 module.

Functions:
<pre>
pm2 start index.js -i 0    
pm2 list   
pm2 show index  
pm2 monit   
pm2 delete index
</pre>

# Worker threads

Mainly experimental. Choose cluster mode in most cases.

<pre>
npm i --save webworker-threads
</pre>

Closures must use postMessage and onMessage. See index_worker.js.