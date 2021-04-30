// Bounded queue implementation. It has a fixed size, and pushing
// elements to the front removes them from the back. Useful for keeping
// a sliding window over incoming data.

export class BoundedQueue {
    constructor(size) {
        this._queue = new Array(size);
    }

    get queue() {
        return Object.freeze(this._queue);
    }

    get length() {
        return this._queue.length;
    }

    push(element) {
        this._queue = this._queue.slice(1);
        this._queue.push(element);
    }
}
