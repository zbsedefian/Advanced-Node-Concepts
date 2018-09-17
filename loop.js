// node myFile.js

const pendingTimers = [];
const pendingOSTasks = [];
const pendingOperations = [];

// New timers, tasks, and operations are recorded from myFile running.
myFile.runContents();

function shouldContinue() {
    // Check one: Any pending setTimeout, setInterval, setImmediate
    // Check two: Any pending OS tasks, e.g. server listening to port
    // Check three: Any pending long running operations, 
    //     e.g. fs module (which reads information off of hard drive.)
    return pendingTimers.length || pendingOSTasks.length || pendingOperations.length;

}

// Represents event loop. 
// Each body execution is called a tick.
while(shouldContinue()) {
    // 1) Node looks at pendingTimers and sees if any functions are
    // ready to be called.
    
    // 2) Node looks at pendingOSTasks and pendingOperations and calls
    // relevant callbacks
    
    // 3) Pause execution. It will continue when...
    // -- a new pendingOSTask is done
    // -- a new pendingOperation is done
    // -- a timer is about to complete

    // 4) Look at pendingTimers and call any setImmediate

    // 5) Handle any 'close' events (see below)
}

// exit to terminal



// Close event example
readStream.on('close', () => {
    console.log("Cleanup code.")
})