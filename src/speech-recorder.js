// Voice activated speech recorder

import { BoundedQueue } from './utils/queue';

const BLOCKSIZE = 1024;

export default class SpeechRecorder {
    constructor(config, callback) {
        this.sampleRate = config.sampleRate;
        this.channels = config.channels;
        this.recordVol = config.recordVol;
        this.maxSilenceS = config.maxSilenceS;
        this.prevAudioS = config.prevAudioS;
        this.blocksize = BLOCKSIZE;

        this.onspeech = callback;
        this.volume = 0;

        this._resetRecorder();
    }

    _resetRecorder() {
        const blocksPerSec = Math.round(this.sampleRate / BLOCKSIZE);

        this.prevVolumes = new BoundedQueue(
            Math.round(blocksPerSec * this.maxSilenceS)
        );

        this.prevBlocks = new BoundedQueue(
            Math.round(blocksPerSec * this.prevAudioS)
        );

        this.activeRecording = [];
    }

    // Has to be run in response to a user gesture
    async init() {
        const audioCtx = new AudioContext({ sampleRate: this.sampleRate });
        let stream;

        try {
            stream = await navigator.mediaDevices.getUserMedia({
                'audio': true
            });
        } catch (error) {
            throw new Error("Couldn't get microphone");
        }

        const mediaStream = audioCtx.createMediaStreamSource(stream);

        const recorder = audioCtx.createScriptProcessor(
            this.blocksize, this.channels, this.channels
        );

        recorder.onaudioprocess = (event) => {
            this._processAudio(event.inputBuffer.getChannelData(0));
        };

        // Using closures here to capture context variables
        this._connect = () => {
            mediaStream.connect(recorder);
            recorder.connect(audioCtx.destination);
        }

        this._disconnect = () => {
            mediaStream.disconnect(recorder);
            recorder.disconnect();
        }
    }

    isRecording() {
        return this.activeRecording.length > 0;
    }

    _processAudio(block) {
        const rmsVolume = rms(block);

        this.volume = rmsVolume;
        this.prevVolumes.enqueue(rmsVolume);

        // TODO: Could probably be refactored
        if (this.prevVolumes.queue.some(vol => vol > this.recordVol)) {
            this.activeRecording.push(new Float32Array(block));
        } else if (this.isRecording()) {
            // Recording finished
            const recording = flatten(
                this.prevBlocks.queue.concat(this.activeRecording)
            );
            this.onspeech(recording);
            this._resetRecorder();
        } else {
            // No audio above recordVol, add previous audio
            this.prevBlocks.enqueue(new Float32Array(block));
        }
    }

    start() {
        return this.init().then(() => {
            this.resume();
        });
    }

    stop() {
        this._disconnect();
    }

    resume() {
        this._connect();
    }
}

function flatten(buffers) {
    const bufSize = BLOCKSIZE;
    let out = new Float32Array(bufSize * buffers.length);

    for (let i = 0; i < buffers.length; i++) {
        out.set(buffers[i], i * bufSize);
    }

    return out;
}

function rms(buffer) {
    return Math.sqrt(sum(buffer.map(square)) / buffer.length);
}

function square(x) {
    return x * x;
}

function sum(arr) {
    return arr.reduce((prev, curr) => {
        return prev + curr;
    });
}
