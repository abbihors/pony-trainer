const KissFFT = require('kissfft-js');
const DCT = require('dct');

const SAMPLE_RATE = 16000;
let sr = 16000;
let samples = new Array(sr);
let context = null;

for (let i = 0; i < sr; i++) {
    samples[i] = Math.random() * 2 - 1;
}

let t0 = Date.now();
let res = fft(samples);
console.log(`took: ${Date.now() - t0} ms`);

// console.log(res);

function fft(y) {
    const fftr = new KissFFT.FFTR(y.length);
    const transform = fftr.forward(y);
    fftr.dispose();
    return transform;
}

// loadBuffer(fileUrl).then(audioBuffer => {
loadExampleBuffer().then(audioBuffer => {
    let samples = audioBuffer.getChannelData(0);
    console.log(samples.slice(0, 10));
    let fft_data = fft(samples);
    console.log(fft_data);
});

const loadEl = document.querySelector('#load');
loadEl.addEventListener('change', function (e) {
    const files = this.files;
    const fileUrl = URL.createObjectURL(files[0]);
    loadBuffer(fileUrl).then(audioBuffer => {
        let samples = audioBuffer.getChannelData(0);
        let fft_data = fft(samples);
        console.log(fft_data);
    });
});


function loadBuffer(url) {
    if (!context) {
        // context = new AudioContext();
        // resample to chosen sample rate
        context = new OfflineAudioContext(1, SAMPLE_RATE, SAMPLE_RATE);
    }

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        // Load an example of speech being spoken.
        xhr.open('GET', url);
        xhr.onload = () => {
            context.decodeAudioData(xhr.response, buffer => {
                resolve(buffer);
            })
        };
        xhr.responseType = 'arraybuffer';
        xhr.onerror = (err) => reject(err);
        xhr.send();
    });
}

function loadExampleBuffer() {
    return loadBuffer('./neigh_sample.wav');
}

async function loadBufferOffline(url) {
    const offlineCtx = new OfflineAudioContext(1, 16000, 16000);
    return fetch(url).then(body => body.arrayBuffer())
        .then(buffer => offlineCtx.decodeAudioData(buffer));
}