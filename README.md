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

# Data caching with Redis

A query hits a mongodb's index, which holds the index of a record.
The index can be, for example, an id property.
However, if the query is looking for a specific title, the index doesn't know where to look, so a full collection scan is done.
This will cause performance issues.

One solution is to have multiple indices. The problem is, it takes longer to write a new record since it must be indexed more than once. On a large scale, the multiple index solution creates performance issues as well.

Caching is a good solution. A cache server checks if the exact query has been issued before. If it hasn't, it then queries MongoDB, and then stores that result in its cache. If it has seen it, the cache server itself serves the data to mongoose.

For example, in a blogRoutes.js file
<pre>
app.get('/api/blogs', requireLogin, async (req, res) => {
    const redis = require('redis');
    const redisUrl = 'redis://127.0.0.1:6379';
    const client = redis.createClient(redisUrl);
    // since client.get() returns a callback function, promisify it
    const util = require('util');
    client.get = util.promisify(client.get);
    
    // Do we have any cached data related to redis?
    const cachedBlogs = await client.get(req.user.id);

    // If yes, respond to request right away
    if (cachedBlogs) {
      return res.send(JSON.parse(cachedBlogs));
    } 

    // If no, query regularly, then update cache to store data
    const blogs = await Blog.find({ _user: req.user.id });
    res.send(blogs);
    client.set(req.user.id, JSON.stringify(blogs));
});
</pre>

Issues:
1) Caching code not reusable --> Hook in to Mongoose's query generation and execeution process.
2) Cached values never expire --> add timeout to values assigned to redis. Add ability to reset all values tied to event.
3) Cached keys won't work when we introduce other collections or query options --> Figure out a more robust solutionfor generating cache keys.

Solutions:
1) const query = Person.find etc. etc.
   // Check if already cached in redis
   // Do so by overwriting query.exec 
   <pre>
   query.exec = function() {
      const result = client.get('query key')
      if (result) {
          return result; 
      }
      const result = runtheOriginalExecFunction();
      client.set('query key', result)
      return result;
   }
   </pre>

2) Has built-in option: client.set('color', 'red', 'EX', 5) // expire after 5 seconds. 
In the blog example, when you create a new post, you're going to want to reset all values tied to redis in order to see the updated list.

3) query.getOptions() will return something like { find: { occupation: 'host' }, where: [{'name.last': 'Ghost' } ] }  etc.
Turn options into a string which will act as a key.

Do this by stringifying this.getQuery() (which will be an id) with this.mongooseCollection.name
<pre>
    const key = JSON.stringify(
        Object.assign({}, this.getQuery(), {
        collection: this.mongooseCollection.name
        })
    )
</pre>