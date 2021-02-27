let fs = require('fs');
let wav = require('node-wav');
let tf = require('@tensorflow/tfjs')

const buf = fs.readFileSync('neigh_sample.wav');
const wavData = wav.decode(buf);
const sr = wavData.sampleRate;
const samples = wavData.channelData[0];

// console.log(samples[0]);

let tensor = tf.tensor(samples);
// console.log(tensor);

let spec = spectrogram(tensor, 2048, 512, 2);

// Compute magnitude spectrogram for tensor
function spectrogram(tensor, n_fft = 2048, hop_length = 512, power = 1) {
    // Pad
    const pad_length = Math.floor(n_fft / 2);
    tensor = tensor.mirrorPad([[pad_length, pad_length]], 'reflect');

    // Run STFT
    let res = tf.signal.stft(tensor, 2048, 512, 2048);

    res = res.abs(); // Discard imaginary part
    res = res.transpose(); // Transpose to match librosa
    res = res.pow(2);

    return res;
}

// console.log(tensor);
console.log(spec);

console.log(spec.arraySync()[0]);
