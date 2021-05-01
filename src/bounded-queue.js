// Bounded queue implementation. It has a fixed size, and pushing
// elements to the front removes them from the back. Useful for keeping
// a sliding window over incoming data.

export class BoundedQueue {
    constructor(size) {
        this.size = size;
        this._queue = new Array();
    }

    get queue() {
        return this._queue.slice();
    }

    get length() {
        return this._queue.length;
    }

    push(element) {
        this._queue.push(element);

        if (this._queue.length > this.size) {
            this._queue = this._queue.slice(1, this.size + 1);
        }
    }
}
