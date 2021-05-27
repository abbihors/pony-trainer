import SpeechRecorder from './speech-recorder';
import Vibrator from './vibrator';
import mfcc from './mfcc';
import { patterns } from './patterns';
import { getRandomInt, getRandomChoice } from './utils/random';
import { EventEmitter } from 'events';

import * as tf from '@tensorflow/tfjs'

const TICKRATE = 200;
const DENIAL_LOWER_MS = 20_000;
const DENIAL_UPPER_MS = 60_000;
const FULL_DECAY_MS = 200_000; // Time to decay from 1 to 0

const MIN_DENIAL_NEIGHS = 2;
const MAX_DENIAL_NEIGHS = 5;

const MAX_BACKGROUND_STRENGTH = 0.3;
const REWARD_STRENGTH = 0.05;

const RECORD_VOL = 0.04;
const MAX_SILENCE_S = 0.8; // This + prevAudioS define min recording length
const PREV_AUDIO_S = 0.2;

const SAMPLERATE = 16000;
const CHANNELS = 1;
const N_FFT = 2048;
const N_MFCC = 40;

export default class PonyTrainer extends EventEmitter {
    constructor() {
        super();

        this.recorder = new SpeechRecorder({
            sampleRate: SAMPLERATE,
            channels: CHANNELS,
            recordVol: RECORD_VOL,
            maxSilenceS: MAX_SILENCE_S,
            prevAudioS: PREV_AUDIO_S
        }, this._processSpeech.bind(this));

        this.vibrator = new Vibrator('Pony Trainer');

        this.vibrator.on('deviceadded', async (deviceName) => {
            this.emit('deviceadded', deviceName);
            // Do a little vibration to confirm device was connected
            await this.vibrator.vibrate(0.2, 500, 0);
        });

        this.vibrator.on('deviceremoved', async () => {
            this.emit('deviceremoved');
        });

        this.model = null;
        this.predicting = false;
        this.ticksToDenial = this._rollTicksToDenial();
        this.neighsToResume = 0;
        this.neighCount = 0;

        this.maxBackgroundStrength = MAX_BACKGROUND_STRENGTH;
    }

    async findToyWebBluetooth() {
        await this.vibrator.scanDevicesWebBluetooth();
    }

    async findToyIntiface(address) {
        await this.vibrator.scanDevicesIntiface(address);
    }

    startListening() {
        return this.recorder.start();
    }

    stopListening() {
        this.recorder.stop();
    }

    async loadModel() {
        this.model = await tf.loadLayersModel('./assets/model.json');
        // Warm up model by giving it an empty input tensor
        this.model.predict(tf.zeros([1, 40, 32, 1]));        
    }

    async play() {
        if (this.model === null) {
            await this.loadModel();
        }

        this.predicting = true;
        this.ticker = setInterval(this._tick.bind(this), TICKRATE);

        if (!this.denied) {
            await this.vibrator.resume();
        }
    }

    async pause() {
        this.predicting = false;
        clearInterval(this.ticker);

        await this.vibrator.pause();
    }

    async deny() {
        this.neighsToResume = getRandomInt(
            MIN_DENIAL_NEIGHS,
            MAX_DENIAL_NEIGHS
        );
        await this.vibrator.stop();
    }

    get denied() {
        return this.neighsToResume > 0;
    }

    async _tick() {
        if (this.denied) return;
        if (this.neighCount === 0) return;

        this.ticksToDenial = Math.max(0, this.ticksToDenial - 1);

        if (!this.vibrator.busy()) {
            await this._decayStep();

            if (this.ticksToDenial === 0) {
                await this.deny();
            }
        }
    }

    async _decayStep() {
        const current = this.vibrator.vibrationLevel;
        const newLevel = Math.max(0, current - 1 / (FULL_DECAY_MS / TICKRATE));

        await this.vibrator.setVibrationLevel(newLevel);
    }

    _rollTicksToDenial() {
        return getRandomInt(
            DENIAL_LOWER_MS / TICKRATE,
            DENIAL_UPPER_MS / TICKRATE
        );
    }

    async _processSpeech(recording) {
        if (!this.predicting) return;

        recording = trim(recording, SAMPLERATE, true);

        const mfccs = mfcc(recording, SAMPLERATE, N_FFT, N_MFCC);
        const prediction = predict(this.model, mfccs);

        if (prediction === "animal") {
            if (!this.vibrator.busy()) {
                await this._rewardPony();
            }
        }
    }

    _increaseBackgroundVibration() {
        let newLevel = this.vibrator.vibrationLevel + REWARD_STRENGTH;
        newLevel = Math.min(newLevel, MAX_BACKGROUND_STRENGTH);
        this.vibrator.vibrationLevel = newLevel;
    }

    async _rewardPony() {
        this.emit('rewardpony');

        this.neighCount += 1;

        if (!this.denied) {
            this._increaseBackgroundVibration();
            await this.runWeightedRandomPattern();
        } else {
            this.neighsToResume -= 1;

            if (this.neighsToResume === 0) {
                this._increaseBackgroundVibration();
                await this.runWeightedRandomPattern();
                this.ticksToDenial = this._rollTicksToDenial();
            }
        }
    }

    async runCmd(cmd) {
        await this.vibrator.vibrate(cmd[0], cmd[1], cmd[2]);
    }

    async runPattern(pattern) {
        for (let cmd of pattern.cmds) {
            await this.runCmd(cmd);
        }
    }

    async runWeightedRandomPattern() {
        let raffle = [];

        for (const [patternName, pattern] of Object.entries(patterns)) {
            for (let i = 0; i < pattern.weight; i++) {
                raffle.push(patternName);
            }
        }

        const winnerName = getRandomChoice(raffle);
        const winner = patterns[winnerName];

        await this.runPattern(winner);
    }

    async testVibrate() {
        if (this.vibrator.vibrationLevel === 0) {
            await this.vibrator.vibrate(0.2, 700, 0);
        }
    }
}

function predict(model, mfccs) {
    let tensor = tf.tensor2d(mfccs, [40, 32], "float32");
    tensor = tensor.reshape([1, 40, 32, 1]);

    if (model.predict(tensor).arraySync() > 0.5) {
        return 'other';
    } else {
        return 'animal';
    }
}

function trim(arr, length, pad = false) {
    if (arr.length >= length) {
        return arr.slice(0, length);
    } else if (pad) {
        let newarr = new Float32Array(length);
        newarr.set(arr, 0);
        return newarr;
    }
}
