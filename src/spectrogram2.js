const KissFFT = require('kissfft-js');
const DCT = require('dct');

const SAMPLE_RATE = 16000;
const N_FFT = 2048;
const N_MEL_FILTERS = 26;
const N_MFCC = 40;

// Checking that DCT works
console.log(DCT([1, 2, 3, 4, 5]));
console.log(dct([1, 2, 3, 4, 5]));

let samples = new Array(SAMPLE_RATE);
let context = null; // ?

// Create filterbank before everything else
let t0 = performance.now();
melFilterBank = createMelFilterBank(SAMPLE_RATE, N_FFT, N_MEL_FILTERS);
console.log(`filterbank took: ${performance.now() - t0} ms`);
console.log(melFilterBank);

function rfft(y) {
    const fftr = new KissFFT.FFTR(y.length);
    const transform = fftr.forward(y);
    fftr.dispose();
    return transform;
}

// Type 2 Discrete Cosine Transform with orthonormalization
function dct(y) {
    y = DCT(y);

    // Orthonormalization
    for (let i = 0; i < y.length; i++) {
        if (i == 0) {
            y[i] *= Math.sqrt(1 / (4 * y.length));
        } else {
            y[i] *= Math.sqrt(1 / (2 * y.length));
        }
    }

    return y;
}

// Computes Mel-Frequency Cepstral Coefficients for y
function mfcc(y, nMfcc) {
    const S = powerSpectrum(y, 2048, 512);

    let mfccs = [];

    for (let i = 0; i < S.length; i++) {
        let logFilterBankEnergies = applyFilterbank(S[i], melFilterBank)
        mfccs[i] = dct(logFilterBankEnergies);
    }

    return mfccs.slice(0, nMfcc);
}

// loadBuffer(fileUrl).then(audioBuffer => {
loadExampleBuffer().then(audioBuffer => {
    let samples = audioBuffer.getChannelData(0);

    // match: librosa.stft(s, 2048, 2048//4, 2048, center=True).T
    let t0 = performance.now();
    let mfccs = mfcc(samples, N_MFCC);
    console.log(`mfcc took: ${performance.now() - t0} ms`);

    console.log(mfccs[0]);
    console.log(mfccs[1]);
});

const loadEl = document.querySelector('#load');
loadEl.addEventListener('change', function (e) {
    const files = this.files;
    const fileUrl = URL.createObjectURL(files[0]);

    loadBuffer(fileUrl).then(audioBuffer => {
        let samples = audioBuffer.getChannelData(0);
        let fft_data = rfft(samples);
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
        const fft_res = rfft(winBuffer);

        matrix[i].set(fft_res);
    }

    return matrix;
}

function square(x) {
    return x * x;
}

// Computes a power spectrum of the input.
// This is equivalent to 2 ** np.abs(stft()), where np.abs is sqrt(a^2 + b^2)
// 2 ** sqrt(a**2 + b**2) == a**2 + b**2
// equivalent librosa call: 
// librosa.core.spectrum._spectrogram(
//      y=y, n_fft=2048, hop_length=512, power=2, center=True)[0].T
function powerSpectrum(y, fftSize = 2048, hopLength = fftSize / 4) {
    const complexSpec = stft(y, fftSize, hopLength);

    return complexSpec.map(fft => {
        let out = new Float32Array(fft.length / 2);

        for (let i = 0; i < fft.length / 2; i++) {
            out[i] = square(fft[i * 2]) + square(fft[i * 2 + 1]);
        }

        return out;
    });
}

function sum(array) {
    return array.reduce((a, b) => { return a + b; });
}

// Use a lower minimum value for energy.
const MIN_VAL = -10;
function logGtZero(val) {
    // Ensure that the log argument is nonnegative.
    const offset = Math.exp(MIN_VAL);
    return Math.log(val + offset);
}

// S_db ~= 10 * log10(S) - 10 * log10(ref)
function powerToDb(val, ref = 1.0) {
    return 10 * Math.log10(val) - 10 * Math.log10(ref);
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

function applyFilterbank(fftEnergies, filterbank) {
    // Apply each filter to the whole FFT signal to get one value.
    let out = new Float32Array(filterbank.length);

    for (let i = 0; i < filterbank.length; i++) {
        // To calculate filterbank energies we multiply each filterbank with the
        // power spectrum.
        const win = applyWindow(fftEnergies, filterbank[i]);

        // Then add up the coefficents, and take the log.
        out[i] = powerToDb(sum(win));
    }

    return out;
}

// Point-wise multiplication between two 1D arrays
function applyWindow(buffer, win) {
    let out = new Float32Array(buffer.length);

    for (let i = 0; i < buffer.length; i++) {
        out[i] = win[i] * buffer[i];
    }

    return out;
}

// Creates melCount linearly spaced mel frequencies between lowHz and
// highHz
function melFrequencies(melCount, lowHz, highHz) {
    const lowMel = hzToMel(lowHz);
    const highMel = hzToMel(highHz);

    const mels = linearSpace(lowMel, highMel, melCount);
    const melFreqs = mels.map(mel => melToHz(mel));

    return melFreqs;
}

function createMelFilterBank(
    sr,
    fftSize = 2048,
    melCount = 128, // example uses 40 mels
    lowHz = 0.0, // 300 might work better
    highHz = sr / 2
) {
    const hzs = melFrequencies(melCount + 2, lowHz, highHz);
    const bins = hzs.map(hz => freqToBin(hz, fftSize));

    const length = bins.length - 2;
    const filters = [];

    for (let i = 0; i < length; i++) {
        filters[i] = triangleWindow(fftSize / 2 + 1, bins[i], bins[i + 1], bins[i + 2]);
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

// Generate a random 1 second audio buffer with values from -1 to 1
function genRandomAudioBuffer(sampleRate) {
    let arr = new Float32Array(sampleRate);

    for (let i = 0; i < sampleRate; i++) {
        arr[i] = Math.random() * 2 - 1;
    }

    return arr;
}
