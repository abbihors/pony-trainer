let Meyda = require('meyda');
let fs = require('fs');
let wav = require('node-wav');

let buf = fs.readFileSync('neigh_sample.wav');
let samples = wav.decode(buf);
let sr = samples.sampleRate;

let samples2 = new Float32Array(16384);
samples2.set(samples, 0);

Meyda.bufferSize = 512; // should be good for speech
Meyda.sampleRate = 16000;
Meyda.melBands = 128; // Meyda defaults to 26, librosa defaults to 128
Meyda.numberOfMFCCCoefficients = 40; // fails after 27

// let samples = new Float32Array([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, ]);

let mfccs = Meyda.extract('mfcc', samples2);

console.log(mfccs);