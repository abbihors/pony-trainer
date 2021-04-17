// let fs = require('fs');
// let wav = require('node-wav');
let tf = require('@tensorflow/tfjs');
let dct = require('dct'); // TODO: replace w/ something better?

// const buf = fs.readFileSync('neigh_sample.wav');
// const wavData = wav.decode(buf);

// const sr = wavData.sampleRate;
// const samples = wavData.channelData[0];

let sr = 16000;
let samples = new Array(16000);

for (let i = 0; i < sr; i++) {
    samples[i] = Math.random();
}

let cachedMel = mel(sr, 2048, n_mels = 128);
cachedMel.print();

// tf.enableProdMode();

let tensor = tf.tensor(samples);
console.log(`tf backend: ${tf.getBackend()}`); // has to be run after 1st op

let start = performance.now();

let mfccs = mfcc(tensor, sr, 40);

let delta = performance.now() - start;
console.log(`MFCC took ${delta} ms`);

console.log(mfccs.shape);
console.log(mfccs.arraySync());

function stft(signal, frameLength, frameStep, fftLength, signalWindow = tf.signal.hannWindow) {
    // I removed fftlength check for simplicity
    const framedSignal = tf.signal.frame(signal, frameLength, frameStep);
    const windowedSignal = tf.mul(framedSignal, signalWindow(fftLength));

    return  tf.spectral.rfft(windowedSignal, frameLength);
}

// Compute magnitude spectrogram (periodogram) for samples
function spectrogram(samples, n_fft = 2048, hop_length = n_fft / 4, power = 1) {
    const pad_length = Math.floor(n_fft / 2);
    let padded = tf.mirrorPad(samples, [[pad_length, pad_length]], 'reflect');
    
    let res = stft(padded, n_fft, hop_length, n_fft);

    res = res.abs(); // Discard imaginary part
    res = res.transpose(); // Transpose to match librosa
    res = res.pow(2);

    return res;
}

function melspectrogram(y, sr = 22050, n_fft = 2048, hopLength = n_fft / 4, power = 2.0) {
    let t0 = performance.now();
    let S = spectrogram(y, n_fft, hopLength, power);
    let t1 = performance.now();
    console.log(`spectrogram took: ${t1 - t0} ms`);

    // console.log('doing mel filters');

    let melBasis = cachedMel;


    return tf.dot(melBasis, S);
}

function tflog10(x) {
    let numerator = tf.log(x);
    let denominator = tf.log(10);

    return numerator.div(denominator);
}

function powerToDb(S, ref = 1.0, amin = 1e-10, topDb = 80.0) {
    let magnitude = S;

    let refValue = tf.abs(ref);

    let logSpec = tf.mul(10.0, tflog10(tf.maximum(amin, magnitude)));
    logSpec = logSpec.sub(tf.mul(10.0, tflog10(tf.maximum(amin, refValue))));
    logSpec = tf.maximum(logSpec, logSpec.max().sub(topDb));

    return logSpec;
}

function mfcc(y, sr = 22050, n_mfcc = 20, dctType = 2) {
    let t0 = performance.now();
    let spec = melspectrogram(y, sr, mfcc_count);
    let t1 = performance.now();
    // console.log(`melspec() took ${t1 - t0} ms`);
    let S = powerToDb(spec);
    S = S.transpose();

    // Convert tensor into arr since TF doesn't have DCT
    let arr = S.arraySync();
    let M = [];

    // console.log('doing dct and sqrt on rows');

    for (let i = 0; i < arr.length; i++) {
        let row = dct(arr[i]);

        row[0] /= Math.sqrt(2);
        for (let j = 0; j < row.length; j++) {
            row[j] /= Math.sqrt(2 * row.length);
        }

        M.push(row);
    }

    // console.log('done, transpoding');

    let t = tf.tensor(M);
    t = t.transpose();

    return t.stridedSlice([0], [n_mfcc]);
}

// Convert freqs tensor to mel
function hzToMel(freqs) {
    let f_min = 0;
    let f_sp = 200 / 3;

    let mels = freqs.sub(f_min).div(f_sp);

    // Fill in the log scale part
    let min_log_hz = 1000.0;
    let min_log_mel = (min_log_hz - f_min) / f_sp;
    let logstep = tf.log(6.4).div(27.0);

    // Pick adjusted freqs if above min hz
    let adjusted_freqs = freqs.div(min_log_hz).log().div(logstep).add(min_log_mel);
    mels = mels.where(freqs.less(min_log_hz), adjusted_freqs);

    return mels;
}

// Convert mel bin numbers to frequencies
function melToHz(mels) {
    let f_min = 0;
    let f_sp = 200 / 3;

    let freqs = mels.mul(f_sp).add(f_min);

    // Fill in the log scale part
    let min_log_hz = 1000.0;
    let min_log_mel = (min_log_hz - f_min) / f_sp;
    let logstep = tf.log(6.4).div(27.0);

    // Pick adjusted mels
    let adjusted_mels = mels.sub(min_log_mel).mul(logstep).exp().mul(min_log_hz);
    freqs = freqs.where(mels.less(min_log_mel), adjusted_mels);

    return freqs;
}

function melFrequencies(n_mels = 128, fmin = 0.0, fmax = 11025.0) {
    const min_mel = hzToMel(tf.tensor(fmin)).dataSync();
    const max_mel = hzToMel(tf.tensor(fmax)).dataSync();

    let mels = tf.linspace(min_mel, max_mel, n_mels);

    return melToHz(mels);
}

function tensorDiff(t) {
    return t.slice(1).sub(t.slice(0, t.size - 1));
}

// create mel filter bank
// probably shouldnt be using concat with tensors, this function is hella slow
function mel(sr, n_fft = 2048, n_mels = 128, fmin = 0.0, fmax, htk = false, norm = 'slaney') {
    if (fmax === undefined) {
        fmax = sr / 2;
    }

    // Initialize weights
    n_mels = Math.floor(n_mels);
    let weights = tf.zeros([0]);

    // Center freqs of each FFT bin
    let fftfreqs = tf.linspace(0, sr / 2, 1 + Math.floor((n_fft / 2)));

    // Creates an linearly spaced array between mel(fmin) and mel(fmax),
    // with n_mels+2 buckets in total. These are then converted back
    // into frequencies.
    let mel_f = melFrequencies(n_mels + 2, fmin = fmin, fmax = fmax);

    let fdiff = tensorDiff(mel_f);
    let ramps = tf.sub(tf.transpose(mel_f.reshape([1, mel_f.shape[0]])), fftfreqs);

    for (let i = 0; i < n_mels; i++) {
        // lower and upper slopes for all bins
        let lower = ramps.gather(i).div(fdiff.gather(i)).neg();
        let upper = ramps.gather(i + 2).div(fdiff.gather(i + 1));

        // .. then intersect them with each other and zero
        let row = tf.maximum(0, tf.minimum(lower, upper));
        row = row.reshape([1, 1 + Math.floor((n_fft / 2))]);
        weights = weights.concat([row]);
    }

    let enorm = tf.div(2, mel_f.slice(2, n_mels).sub(mel_f.slice(0, n_mels)));
    enorm = enorm.reshape([128, 1]);
    weights = weights.mul(enorm);

    return weights;
}
