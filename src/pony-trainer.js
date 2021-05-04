import SpeechRecorder from './speech-recorder';
import Vibrator from './vibrator';
import mfcc from './mfcc';
import { patterns } from './patterns';
import { getRandomInt, getRandomChoice } from './utils/random';

import * as tf from '@tensorflow/tfjs'

const TICKRATE = 200;
const DENIAL_LOWER_MS = 20_000;
const DENIAL_UPPER_MS = 60_000;
const FULL_DECAY_MS = 200_000; // Time to decay from 1 to 0

const MIN_DENIAL_NEIGHS = 2;
const MAX_DENIAL_NEIGHS = 5;

const MAX_BACKGROUND_STRENGTH = 0.3;
const REWARD_STRENGTH = 0.05;

const SAMPLERATE = 16000;
const CHANNELS = 1;
const N_FFT = 2048;
const N_MFCC = 40;

export default class PonyTrainer {
    constructor() {
        this.recorder = new SpeechRecorder({
            sampleRate: SAMPLERATE,
            channels: CHANNELS,
            recordVol: 0.04,
            maxSilenceS: 0.8, // This + prevAudioS define min recording length
            prevAudioS: 0.2
        }, this._processSpeech.bind(this));

        this.vibrator = new Vibrator('Pony Trainer');

        this.ticksToDenial = this._rollTicksToDenial();
        this.neighsToResume = 0;
    }

    findToys() {
        return this.vibrator.findToys();
    }

    start() {
        tf.loadLayersModel('./assets/model.json').then((layersModel) => {
            // Warm up model by giving it an empty input tensor
            layersModel.predict(tf.zeros([1, 40, 32, 1]));
            this.model = layersModel;

            this.recorder.start();
            this.ticker = setInterval(this._tick.bind(this), TICKRATE);
        });
    }

    resume() {
        this.recorder.start();
        this.ticker = setInterval(this._tick.bind(this), TICKRATE);
    }

    pause() {
        this.recorder.stop();
        clearInterval(this.ticker);
    }

    get denied() {
        return this.neighsToResume > 0;
    }

    async _tick() {
        if (this.denied) return;

        if (!this.vibrator.busy()) {
            await this._decayStep();
        }

        this.ticksToDenial = Math.max(0, this.ticksToDenial - 1);

        if (!this.vibrator.busy() && this.ticksToDenial === 0) {
            await this.vibrator.stop();
            this.neighsToResume = getRandomInt(
                MIN_DENIAL_NEIGHS,
                MAX_DENIAL_NEIGHS
            );
            console.log(`Denied! neighs to resume: ${this.neighsToResume}`); // DEBUG
        }
    }

    async _decayStep() {
        const current = this.vibrator.vibrationLevel;
        const newLevel = Math.max(0, current - 1 / (FULL_DECAY_MS / TICKRATE));

        await this.vibrator.setVibrationLevel(newLevel);
        console.log(`Decrementing vibrator: ${newLevel}`); // DEBUG
    }

    _rollTicksToDenial() {
        return getRandomInt(
            DENIAL_LOWER_MS / TICKRATE,
            DENIAL_UPPER_MS / TICKRATE
        );
    }

    async _processSpeech(recording) {
        recording = trim(recording, SAMPLERATE, true);

        const mfccs = mfcc(recording, SAMPLERATE, N_FFT, N_MFCC);
        const prediction = predict(this.model, mfccs);

        console.log(prediction); // DEBUG

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
        if (!this.denied) {
            this._increaseBackgroundVibration();
            await this.runWeightedRandomPattern();
        } else {
            this.neighsToResume -= 1;

            if (this.neighsToResume === 0) {
                this.ticksToDenial = this._rollTicksToDenial();
                await this.runWeightedRandomPattern();
            }
        }
    }

    async runPattern(pattern) {
        for (let cmd of pattern.cmds) {
            await this.vibrator.vibrate(cmd[0], cmd[1], cmd[2]);
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
        console.log(`Running pattern: ${winnerName}`); // DEBUG
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
