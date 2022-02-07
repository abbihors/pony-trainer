export class Queue {
    constructor() {
        this._queue = new Array();
    }

    get queue() {
        return this._queue.slice();
    }

    get length() {
        return this._queue.length;
    }

    empty() {
        return this._queue.length === 0;
    }

    enqueue(elem) {
        this._queue.push(elem);
    }

    dequeue() {
        return this._queue.shift();
    }

    front() {
        return this._queue[0];
    }
}

export class BoundedQueue extends Queue {
    constructor(size) {
        super();
        this.size = size;
    }

    enqueue(element) {
        this._queue.push(element);

        if (this._queue.length > this.size) {
            this._queue = this._queue.slice(1, this.size + 1);
        }
    }
}
