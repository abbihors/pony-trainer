const KissFFT = require('kissfft-js');
const DCT = require('dct');

const SAMPLE_RATE = 16000;
const N_FFT = 2048;
const MEL_COUNT = 128;

let samples = new Array(SAMPLE_RATE);
let context = null; // ?

for (let i = 0; i < SAMPLE_RATE; i++) {
    samples[i] = Math.random() * 2 - 1;
}

// const hzs = melFrequencies(5, 0, 11025);
// console.log(hzs);

let t0 = performance.now();
melFilterBank = createMelFilterbank(SAMPLE_RATE, N_FFT, 10);
console.log(`filterbank took: ${performance.now() - t0} ms`);
console.log(melFilterBank);

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

function stft(y, fftSize = 2048, hopSize = fftSize / 4) {
    const padLength = Math.floor(fftSize / 2);
    const padded = reflectPad(y, padLength);

    // Split the input buffer into sub-buffers of size fftSize.
    const bufferCount = Math.floor((padded.length - fftSize) / hopSize) + 1;

    // create 28x2050 (i.e. 28x1025) buffers
    let matrix = range(bufferCount).map(x => new Float32Array(fftSize + 2));
    for (let i = 0; i < bufferCount; i++) {
        const ind = i * hopSize;
        const buffer = padded.slice(ind, ind + fftSize);

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

// Creates a linearly spaced array between mel(lowHz) and mel(highHz),
// with melCount+2 buckets in total. These are then converted back into
// frequencies. This is producting ever so slightly different results
// compared to librosa (floating point rounding on the end) but its
// probably fine.
function melFrequencies(melCount, lowHz, highHz) {
    const lowMel = hzToMel(lowHz);
    const highMel = hzToMel(highHz);

    const mels = linearSpace(lowMel, highMel, melCount);
    const melFreqs = mels.map(mel => melToHz(mel));

    return melFreqs;
}

function createMelFilterbank(
    sr,
    fftSize = 2048,
    melCount = 128, // example uses 40 mels
    lowHz = 0.0, // 300 might work better
    highHz = sr / 2
) {
    const hzs = melFrequencies(melCount + 2, lowHz, highHz);
    
    // Go from hz to the corresponding bin in the FFT
    const bins = hzs.map(hz => freqToBin(hz, fftSize));
    console.log(bins);

    // Now that we have the start and end frequencies, create each triangular
    // window (each value in [0, 1]) that we will apply to an FFT later. These
    // are mostly sparse, except for the values of the triangle
    const length = bins.length - 2;
    const filters = [];

    for (let i = 0; i < length; i++) {
        // Now generate the triangles themselves
        filters[i] = triangleWindow(fftSize + 2, bins[i], bins[i + 1], bins[i + 2]);
    }

    return filters;
}

function triangleWindow(length, startIndex, peakIndex, endIndex) {
    const win = new Float32Array(length);
    const deltaUp = 1.0 / (peakIndex - startIndex);
    const deltaDown = 1.0 / (endIndex - peakIndex);

    for (let i = startIndex; i < peakIndex; i++) {
        // Linear ramp up between start and peak index (values from 0 to 1).
        win[i] = (i - startIndex) * deltaUp;
    }
    
    for (let i = peakIndex; i < endIndex; i++) {
        // Linear ramp down between peak and end index (values from 1 to 0).
        win[i] = 1 - (i - peakIndex) * deltaDown;
    }
    
    return win;
}

// HTK-style conversion
function hzToMel(hz) {
    return 2595.0 * Math.log10(1 + hz / 700);
}

function melToHz(mel) {
    return 700.0 * (10.0 ** (mel / 2595.0) - 1.0);
}

function freqToBin(freq, fftSize, sr = SAMPLE_RATE) {
    return Math.floor((fftSize + 1) * freq / sr);
}

// Returns amount elements evenly spaced between start and end, including end
function linearSpace(start, end, amount) {
    const delta = (end - start) / (amount - 1);

    let out = [];

    for (let i = 0; i < amount - 1; i++) {
        out[i] = start + delta * i;
    }

    out.push(end);

    return out;
}
