import KissFFT from 'kissfft-js';
import DCT from 'dct';

// Computes Mel-Frequency Cepstral Coefficients for y
export function mfcc(y, sampleRate, fftSize, nMfcc) {
    const S = powerSpectrum(y, 2048, 512);

    let mfccs = [];
    const melFilterBank = createMelFilterBank(sampleRate, fftSize, nMfcc);

    for (let i = 0; i < S.length; i++) {
        let logFilterBankEnergies = applyFilterbank(S[i], melFilterBank)
        mfccs[i] = dct(logFilterBankEnergies);
    }

    mfccs = mfccs.slice(0, nMfcc)
    mfccs = transpose(mfccs);

    return mfccs;
}

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

        // In the end, we will likely have an incomplete buffer, which
        // we should just ignore.
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

function applyFilterbank(fftEnergies, filterbank) {
    // Apply each filter to the whole FFT signal to get one value.
    let out = new Float32Array(filterbank.length);

    for (let i = 0; i < filterbank.length; i++) {
        // To calculate filterbank energies we multiply each filterbank
        // with the power spectrum.
        const win = applyWindow(fftEnergies, filterbank[i]);

        // Then add up the coefficents, and take the log.
        out[i] = powerToDb(sum(win));
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
    melCount = 40,
    lowHz = 0.0,
    highHz = sr / 2
) {
    const hzs = melFrequencies(melCount + 2, lowHz, highHz);
    const bins = hzs.map(hz => freqToBin(hz, fftSize, sr));

    const length = bins.length - 2;
    const filters = [];

    for (let i = 0; i < length; i++) {
        filters[i] = triangleWindow(
            fftSize / 2 + 1, bins[i], bins[i + 1], bins[i + 2]
        );
    }

    return filters;
}

function triangleWindow(length, startIndex, peakIndex, endIndex) {
    const win = new Float32Array(length);
    const deltaUp = 1.0 / (peakIndex - startIndex);
    const deltaDown = 1.0 / (endIndex - peakIndex);

    // Create filter by ramping from start to peak to end
    for (let i = startIndex; i < peakIndex; i++) {
        win[i] = (i - startIndex) * deltaUp;
    }

    for (let i = peakIndex; i < endIndex; i++) {
        win[i] = 1 - (i - peakIndex) * deltaDown;
    }

    return win;
}

function hannWindow(length) {
    let win = new Float32Array(length);
    for (let i = 0; i < length; i++) {
        win[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (length - 1)));
    }
    return win;
}

// Point-wise multiplication between two 1D arrays
function applyWindow(buffer, win) {
    let out = new Float32Array(buffer.length);

    for (let i = 0; i < buffer.length; i++) {
        out[i] = win[i] * buffer[i];
    }

    return out;
}

// HTK-style conversion
function hzToMel(hz) {
    return 2595.0 * Math.log10(1 + hz / 700);
}

function melToHz(mel) {
    return 700.0 * (10.0 ** (mel / 2595.0) - 1.0);
}

function freqToBin(freq, fftSize, sr) {
    return Math.floor((fftSize + 1) * freq / sr);
}

// Returns amount elements evenly spaced between start and end,
// including end
function linearSpace(start, end, amount) {
    const delta = (end - start) / (amount - 1);

    let out = [];

    for (let i = 0; i < amount - 1; i++) {
        out[i] = start + delta * i;
    }

    out.push(end);

    return out;
}

function square(x) {
    return x * x;
}

function sum(array) {
    return array.reduce((a, b) => { return a + b; });
}

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

function transpose(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const grid = [];

    for (let j = 0; j < cols; j++) {
        grid[j] = new Float32Array(rows);
    }

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            grid[j][i] = matrix[i][j];
        }
    }

    return grid;
}
