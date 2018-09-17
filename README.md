# Understanding Node internals

Node runs on two dependencies: V8 (a google runtime which interprets and executes JS code) and libuv (a C++ wrapper that allows access to syscalls).

Node -> process.binding() which connects JS to C++ functions -> V8 converts JS to C++

# Node event loop

Node creates one thread when it's executed. Inside that thread is an event loop.
