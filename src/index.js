import { SpeechRecorder } from './speech-recorder';
import { Vibrator } from './vibrator';
import { encodeWavInt16 } from './encode-wav';
import { mfcc } from './mfcc';

import * as tf from '@tensorflow/tfjs'
import * as JSZip from 'jszip';

const SAMPLERATE = 16000;
const CHANNELS = 1;
const N_FFT = 2048;
const N_MFCC = 40;

let model;
let recorder;
let vibrator;
let zip;

initApp();

const recordButton = document.querySelector('#btn-record');
const stopButton = document.querySelector('#btn-stop');
const downloadButton = document.querySelector('#btn-dl');
const scanButton = document.querySelector('#btn-scan');
const recordCheckbox = document.querySelector('#save-samples');

recorder.onspeech = (recording) => {
    recording = trim(recording, SAMPLERATE, true);

    const mfccs = mfcc(recording, SAMPLERATE, N_FFT, N_MFCC);
    const prediction = predict(model, mfccs);

    console.log(prediction);

    if (prediction === "animal") {
        vibrator.vibrateFor(0.3, 200);
    }

    if (recordCheckbox.checked) {
        zip.file(
            `recorded_samples/${prediction}/web_${Date.now()}.wav`,
            encodeWavInt16(recording, SAMPLERATE, CHANNELS)
        );
    }
}

recordButton.onclick = () => {
    recorder.start();
    zip = new JSZip();
};

stopButton.onclick = () => {
    recorder.stop();
};

scanButton.onclick = () => {
    vibrator.scanForToys();
}

downloadButton.onclick = () => {
    zip.generateAsync({ type: 'blob' }).then(saveBlob);
}

recordCheckbox.onclick = (e) => {
    downloadButton.disabled = !recordCheckbox.checked;
}

function prepareDownload(recording) {
    const wavData = encodeWavInt16(recording, SAMPLERATE, CHANNELS);
    const blob = new Blob([wavData], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
}

// Hacky way to download a blob
function saveBlob(blob) {
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'recorded_samples.zip';
    a.click();
    a.remove();
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
    tf.loadLayersModel('./assets/model.json').then((layersModel) => {
        model = layersModel;
        // Warm up model by giving it an empty input tensor
        model.predict(tf.zeros([1, 40, 32, 1]));
    });

    recorder = new SpeechRecorder({
        sampleRate: SAMPLERATE,
        channels: CHANNELS,
        recordVol: 0.04,
        maxSilenceS: 0.8, // This + prevAudioS define min recording length
        prevAudioS: 0.2
    });

    vibrator = new Vibrator("Pony Trainer");
}
