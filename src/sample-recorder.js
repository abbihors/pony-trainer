import SpeechRecorder from './speech-recorder';
import encodeWavInt16 from './utils/encode-wav';

import * as JSZip from 'jszip';

const RECORD_VOL = 0.04;
const MAX_SILENCE_S = 0.8; // This + prevAudioS define min recording length
const PREV_AUDIO_S = 0.2;

const SAMPLERATE = 16000;
const CHANNELS = 1;

let recorder = new SpeechRecorder({
    sampleRate: SAMPLERATE,
    channels: CHANNELS,
    recordVol: RECORD_VOL,
    maxSilenceS: MAX_SILENCE_S,
    prevAudioS: PREV_AUDIO_S
}, processSpeech);

const SLOPE_FACTOR = -4;

const listenButton = document.querySelector('#btn-listen');
const listenError = document.querySelector('#err-listen');
const sampleCounter = document.querySelector('#sample-count');
const downloadButton = document.querySelector('#btn-dl');

let sampleCount = 0;
let zip;

function processSpeech(recording) {
    recording = trim(recording, SAMPLERATE, true);

    zip.file(
        `recorded_samples/web_${Date.now()}.wav`,
        encodeWavInt16(recording, SAMPLERATE, CHANNELS)
    );

    sampleCount += 1;
    sampleCounter.innerHTML = `${sampleCount}`;
}

listenButton.onclick = () => {
    recorder.start().then(() => {
        const wrapperListen = document.querySelector('.wrapper-listen');

        wrapperListen.style.display = 'inline-block';
        listenButton.disabled = true;
        listenButton.style.display = 'none';
        listenError.style.display = 'none';

        zip = new JSZip();
    }).catch((err) => {
        console.log(err);
        listenError.style.display = 'block';
    });
}

downloadButton.onclick = () => {
    zip.generateAsync({ type: 'blob' }).then(saveBlob);
}

// Hacky way to download a blob
function saveBlob(blob) {
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'recorded_samples.zip';
    a.click();
    a.remove();
}

const slider = document.querySelector('#threshold');
let recordVol = document.querySelector('.voicemeter-recordvol');

recordVol.style.transform = `translateX(${islope(0.5, SLOPE_FACTOR) * 246}px)`;
slider.value = islope(0.5, SLOPE_FACTOR);

slider.oninput = (e) => {
    const newValue = e.target.value * 246;

    let recordVol = document.querySelector('.voicemeter-recordvol');

    ponyTrainer.recorder.recordVol = islope(e.target.value, SLOPE_FACTOR);

    recordVol.style.transform = `translateX(${newValue}px)`;
}

let volumeMeterLevel = 0;

function updateVolumeMeter() {
    const vol = recorder.volume;

    let newVol = slope(vol, SLOPE_FACTOR) * 100;

    if (newVol < 1) {
        newVol = 0;
    }

    if (Math.abs(volumeMeterLevel - newVol) > 1) {
        volumeMeterLevel = newVol;
        const meter = document.querySelector('.voicemeter');
        meter.style.width = `${newVol}%`;
    }

    let wrapper = document.querySelector('.voicemeter-wrapper');

    if (vol > recorder.recordVol) {
        wrapper.style.filter = 'drop-shadow(0 0 4px #00aa00)';
    } else if (!recorder.isRecording()) {
        wrapper.style.filter = '';
    }
}

setInterval(updateVolumeMeter, 50);

function slope(x, k) {
    return (Math.exp(k * x) - 1) / (Math.exp(k) - 1);
}

function islope(x, k) {
    return Math.log((x * (Math.exp(k) - 1)) + 1) / k;
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
