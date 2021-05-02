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

let recordVolume = 0.04;

initApp();

const recordButton = document.querySelector('#btn-record');
const stopButton = document.querySelector('#btn-stop');
const downloadButton = document.querySelector('#btn-dl');
const scanButton = document.querySelector('#btn-scan');
const recordCheckbox = document.querySelector('#save-samples');
const recordVolSlider = document.querySelector('#record-vol-slider');
const recordVolBox = document.querySelector('#record-vol-box');
const indicatorCanvas = document.querySelector('#record-indicator');

recordVolSlider.value = recordVolume;
recordVolBox.value = recordVolume;

recorder.onspeech = (recording) => {
    recording = trim(recording, SAMPLERATE, true);

    const mfccs = mfcc(recording, SAMPLERATE, N_FFT, N_MFCC);
    const prediction = predict(model, mfccs);

    console.log(prediction);

    if (prediction === "animal") {
        vibrator.vibrateFor(0.3, 200);
    }

    // TODO: move to sample recorder or something
    if (recordCheckbox.checked) {
        zip.file(
            `recorded_samples/${prediction}/web_${Date.now()}.wav`,
            encodeWavInt16(recording, SAMPLERATE, CHANNELS)
        );
    }
}

recordButton.addEventListener('click', () => {
    recorder.start();
    zip = new JSZip();
});

stopButton.addEventListener('click', () => {
    recorder.stop();
});

scanButton.addEventListener('click', () => {
    vibrator.scanForToys();
});

downloadButton.addEventListener('click', () => {
    zip.generateAsync({ type: 'blob' }).then(saveBlob);
});

recordCheckbox.addEventListener('click', () => {
    downloadButton.disabled = !recordCheckbox.checked;
});

recordVolSlider.addEventListener('input', (e) => {
    const vol = e.target.value;
    recorder.recordVol = vol;
    recordVolBox.value = vol;
});

recordVolBox.addEventListener('change', (e) => {
    const vol = e.target.value;
    recorder.recordVol = vol;
    recordVolSlider.value = vol;
});

const ctx = indicatorCanvas.getContext('2d');
ctx.fillStyle = 'grey';
ctx.fillRect(5, 5, 20, 20);

stopButton.addEventListener('click', () => {
    const ctx = indicatorCanvas.getContext('2d');
    ctx.fillStyle = 'grey';
    ctx.fillRect(5, 5, 20, 20);
});

recordButton.addEventListener('click', () => {
    const ctx = indicatorCanvas.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.fillRect(5, 5, 20, 20);
});

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
        recordVol: recordVolume,
        maxSilenceS: 0.8, // This + prevAudioS define min recording length
        prevAudioS: 0.2
    });

    vibrator = new Vibrator("Pony Trainer");
}
