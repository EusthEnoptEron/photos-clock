import clock from 'clock';



export class EventQueue {
    // private queue: (() => void)[] = [];
    constructor() {
        // clock.addEventListener("tick", () => {
        //     while(this.queue.length > 0) {
        //         this.queue.shift()();
        //     }
        // });
    }

    post(fn: () => void) {
        fn();
        // this.queue.push(fn);
    }

}