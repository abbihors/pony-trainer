import { SpeechRecorder } from './speech-recorder';
import { encodeWavInt16 } from './encode-wav';
import { mfcc } from './mfcc';

import * as tf from '@tensorflow/tfjs'
import { JSZip } from 'jszip';

const SAMPLERATE = 16000;
const CHANNELS = 1;
const N_FFT = 2048;
const N_MFCC = 40;

let model = null;

let recorder = new SpeechRecorder({
    sampleRate: SAMPLERATE,
    channels: CHANNELS,
    recordVol: 0.04,
    maxSilenceS: 1.0,
    prevAudioS: 0.2
});

initApp();

recorder.onspeech = (recording) => {
    recording = trim(recording, SAMPLERATE, true);

    const mfccs = mfcc(recording, SAMPLERATE, N_FFT, N_MFCC);
    const prediction = predict(model, mfccs);

    console.log(prediction);
}

const recordButton = document.querySelector('#btn-record');
const stopButton = document.querySelector('#btn-stop');
const downloadLink = document.querySelector('#download');

recordButton.onclick = () => {
    recorder.start();
};

stopButton.onclick = () => {
    recorder.stop();
};

function prepareDownload(recording) {
    const wavData = encodeWavInt16(recording, SAMPLERATE, CHANNELS);
    const blob = new Blob([wavData], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
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

function initApp() {
    tf.loadLayersModel('./model.json').then((layersModel) => {
        // Warm up model by giving it an empty input tensor
        layersModel.predict(tf.zeros([1, 40, 32, 1]));
        model = layersModel;
    });

    // TODO: Set up Buttplug
}
