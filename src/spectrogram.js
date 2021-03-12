let fs = require('fs');
let wav = require('node-wav');
let tf = require('@tensorflow/tfjs');
let dct = require('dct');

const buf = fs.readFileSync('neigh_sample.wav');
const wavData = wav.decode(buf);
const sr = wavData.sampleRate;
const samples = wavData.channelData[0];

// console.log(samples[0]);

let tensor = tf.tensor(samples);
// console.log(tensor);

let spec = spectrogram(samples, 2048, 512, 2);

// Compute magnitude spectrogram (periodogram) for samples
function spectrogram(samples, n_fft = 2048, hop_length = 512, power = 1) {
    // Pad
    const pad_length = Math.floor(n_fft / 2);
    let padded = tf.mirrorPad(samples, [[pad_length, pad_length]], 'reflect');

    // Run STFT
    let res = tf.signal.stft(padded, 2048, 512, 2048);

    res = res.abs(); // Discard imaginary part
    res = res.transpose(); // Transpose to match librosa
    res = res.pow(2);

    return res;
}

function melspectrogram(y, sr = 22050, n_fft = 2048, hopLength = 512, power = 2.0) {
    let S = spectrogram(y, n_fft, hopLength, power);

    let melBasis = mel(sr, n_fft);

    return tf.dot(melBasis, S);
}

function log10(x) {
    let numerator = tf.log(x);
    let denominator = tf.log(10);

    return numerator.div(denominator);
}

// def power_to_db(S, ref=1.0, amin=1e-10, top_db=80.0):
function powerToDb(S, ref = 1.0, amin = 1e-10, topDb = 80.0) {
    let magnitude = S;

    let refValue = tf.abs(ref);

    // console.log(S.shape)

    let logSpec = tf.mul(10.0, log10(tf.maximum(amin, magnitude)));
    // logSpec.print()
    logSpec = logSpec.sub(tf.mul(10.0, log10(tf.maximum(amin, refValue))));

    logSpec = tf.maximum(logSpec, logSpec.max().sub(topDb));

    return logSpec;
}

function mfcc(y, sr = 22050, n_mfcc = 20, dctType = 2) {
    // TODO: something is going wrong with either of these toward the end
    let spec = melspectrogram(y, sr);
    // spec.print()
    let S = powerToDb(spec);
    // S.print()

    // S.print()
    S = S.transpose();
    console.log(S.shape);
    // S.print()

    // Convert tensor into arr since TF doesn't have DCT
    let arr = S.arraySync();
    // console.log(arr.slice(0, 1));
    // console.log(arr.slice(arr.length - 1, arr.length));

    // console.log(arr[0])

    let M = [];

    for (let i = 0; i < arr.length; i++) {
        let row = dct(arr[i]);
        
        row[0] /= Math.sqrt(2);
        for (let j = 0; j < row.length; j++) {
            row[j] /= Math.sqrt(2 * row.length);
        }

        M.push(row);
    }

    // console.log(M[0])

    let t = tf.tensor(M);

    t = t.transpose();

    console.log(t.arraySync()[0]);

    // M = M.slice(0, 40);

    // console.log(M[0]);
}

// melspectrogram(samples, sr).print()

// console.log(dct([1,2,3,4]));
mfcc(samples, sr);

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

// let res = hzToMel(tf.tensor([11025.0]));
// console.log(res.dataSync());

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

// res = melToHz(hzToMel(tf.tensor([11025.0])));
// console.log(res.dataSync());

function melFrequencies(n_mels = 128, fmin = 0.0, fmax = 11025.0) {
    const min_mel = hzToMel(tf.tensor(fmin)).dataSync();
    const max_mel = hzToMel(tf.tensor(fmax)).dataSync();
    
    let mels = tf.linspace(min_mel, max_mel, n_mels);

    return melToHz(mels);
}

// console.log(melFrequencies(42).dataSync());


function tensorDiff(t) {
    return t.slice(1).sub(t.slice(0, t.size - 1));
}

// let t1 = tf.tensor([1, 2, 4, 7, 0]);
// console.log(tensorDiff(t1).dataSync());

// create mel filter bank
function mel(sr, n_fft = 2048, n_mels = 128, fmin = 0.0, fmax, htk = false, norm = 'slaney') {
    if (fmax === undefined) {
        fmax = sr / 2;
    }

    // Initialize weights
    n_mels = Math.floor(n_mels);
    // let weights = tf.zeros([n_mels, Math.floor(1 + n_fft / 2)]);
    let weights = tf.zeros([0]);

    // Center freqs of each FFT bin
    let fftfreqs = tf.linspace(0, sr / 2, 1 + Math.floor((n_fft / 2)));
    // console.log(fftfreqs.dataSync());

    // 'Center freqs' of mel bands - uniformly spaced between limits
    let mel_f = melFrequencies(n_mels + 2, fmin=fmin, fmax=fmax, htk=htk);

    let fdiff = tensorDiff(mel_f);
    let ramps = tf.sub(tf.transpose(mel_f.reshape([1, mel_f.shape[0]])), fftfreqs);
    // console.log(ramps.slice([0, 0]));

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

    // weights.print();
    return weights;
}

// console.log(melFrequencies(40 + 2, 0.0, 8000, false).dataSync())
// mel(16000).print();


// console.log(tensor);
// console.log(spec);

// console.log(spec.arraySync()[0]);
