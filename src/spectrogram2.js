const KissFFT = require('kissfft-js');
const DCT = require('dct');

const SAMPLE_RATE = 16000;
let sr = 16000;
let samples = new Array(sr);
let context = null;

for (let i = 0; i < sr; i++) {
    samples[i] = Math.random() * 2 - 1;
}

// let t0 = Date.now();
// let res = fft(samples);
// console.log(`took: ${Date.now() - t0} ms`);

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
    // console.log(samples.slice(0, 10));
    // let fft_data = fft(samples);
    // console.log(fft_data);

    // match: librosa.stft(s, 2048, 2048//4, 2048, center=True).T
    let t0 = performance.now();        
    samples = reflectPad(samples, 1024);
    
    let res = stft(samples, 2048, 512);
    console.log(`stft took: ${performance.now() - t0} ms`);

    console.log(res);

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

// Reflect pad amount on both sides of arr. This shouldn't have to be
// too fast because it's only run once per sample.
function reflectPad(arr, amount) {
    let newArr = new Float32Array(arr.length + amount * 2)

    // Reflect start and end
    for (let i = 0; i < amount; i++) {
        newArr[amount - i - 1] = arr[i + 1];
        newArr[newArr.length + i - amount] = arr[arr.length - i - 2];
    }

    // Copy the middle
    newArr.set(arr, amount);

    return newArr;
}

// TODO: add centering like in librosa?
function stft(y, fftSize = 2048, hopSize = fftSize / 4) {
    // console.log(`y size: ${y.length}, fftSize: ${fftSize}, hopSize: ${hopSize}`);
    // Split the input buffer into sub-buffers of size fftSize.
    const bufferCount = Math.floor((y.length - fftSize) / hopSize) + 1;
    // create 28x2050 (i.e. 28x1025) buffers
    let matrix = range(bufferCount).map(x => new Float32Array(fftSize + 2));
    for (let i = 0; i < bufferCount; i++) {
        const ind = i * hopSize;
        const buffer = y.slice(ind, ind + fftSize);
        // In the end, we will likely have an incomplete buffer, which we should
        // just ignore.
        if (buffer.length != fftSize) {
            continue;
        }

        const win = hannWindow(buffer.length);
        const winBuffer = applyWindow(buffer, win);
        const fft_res = fft(winBuffer);
        matrix[i].set(fft_res);
    }
    return matrix;
}


function sum(array) {
    return array.reduce(function (a, b) { return a + b; });
}

function range(count) {
    let out = [];
    for (let i = 0; i < count; i++) {
        out.push(i);
    }
    return out;
}

function hannWindow(length) {
    let win = new Float32Array(length);
    for (let i = 0; i < length; i++) {
        win[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (length - 1)));
    }
    return win;
}

/**
 * Applies a window to a buffer (point-wise multiplication).
 */
function applyWindow(buffer, win) {
    if (buffer.length != win.length) {
        console.error(`Buffer length ${buffer.length} != window length
        ${win.length}.`);
        return;
    }

    let out = new Float32Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
        out[i] = win[i] * buffer[i];
    }
    return out;
}