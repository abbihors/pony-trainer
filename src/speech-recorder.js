// Voice activated speech recorder

import { BoundedQueue } from './bounded-queue';

export class SpeechRecorder {
    constructor(sampleRate, channels, recordVol, maxSilenceS, prevAudioS) {
        this.sampleRate = sampleRate;
        this.channels = channels;
        this.recordVol = recordVol;
        this.blocksize = 1024;
        this.maxSilenceS = maxSilenceS;
        this.prevAudioS = prevAudioS;

        this.started = false;
        this.ready = false;

        this.resetRecorder();
    }

    processAudio(block) {
        const rmsVolume = rms(block);

        if (rmsVolume > this.recordVol) {
            console.log(rmsVolume);
        }

        this.prevVolumes.push(rmsVolume);

        if (this.prevVolumes.queue.some(vol => vol > this.recordVol)) {
            // Still have recent volume above recordVol, add buffer and
            // keep recording
            if (!this.recordingStarted) {
                this.recordingStarted = true;
            }
            this.activeRecording.push(new Float32Array(block));
        } else if (this.recordingStarted) {
            // Recording finished
            if (this.onspeech !== undefined) {
                const recording = flatten(this.prevBlocks.queue.concat(this.activeRecording));
                this.onspeech(recording);
            }
            this.resetRecorder();
        } else {
            // No audio above recordVol, add previous audio
            this.prevBlocks.push(new Float32Array(block));
        }
    }

    resetRecorder() {
        const blocksPerSec = Math.round(this.sampleRate / this.blocksize);

        this.prevVolumes = new BoundedQueue(
            Math.round(blocksPerSec * this.maxSilenceS)
        );

        this.prevBlocks = new BoundedQueue(
            Math.round(blocksPerSec * this.prevAudioS)
        );

        this.activeRecording = [];
        this.recordingStarted = false;
    }

    // Has to be run in response to a user gesture
    async init() {
        const audioCtx = new AudioContext({ sampleRate: this.sampleRate });
        const stream = await navigator.mediaDevices.getUserMedia({ 'audio': true });

        const mediaStream = audioCtx.createMediaStreamSource(stream);

        const recorder = audioCtx.createScriptProcessor(
            this.blocksize, this.channels, this.channels
        );

        recorder.onaudioprocess = (event) => {
            this.processAudio(event.inputBuffer.getChannelData(0));
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

        this.ready = true;
    }

    async start() {
        if (!this.ready) {
            await this.init();
        }

        this._connect();
        this.started = true;
    }

    stop() {
        if (!this.ready) return;

        this._disconnect();
        this.started = false;
    }
}

function flatten(buffers) {
    const bufSize = buffers[0].length;
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
