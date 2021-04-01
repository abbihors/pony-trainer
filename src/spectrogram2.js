const KissFFT = require('kissfft-js');
const DCT = require('dct');

let sr = 16000;
let samples = new Array(sr);

for (let i = 0; i < sr; i++) {
    samples[i] = Math.random() * 2 - 1;
}

let t0 = Date.now();
let res = fft(samples);
console.log(`took: ${Date.now() - t0} ms`);

console.log(res);

function fft(y) {
    const fftr = new KissFFT.FFTR(y.length);
    const transform = fftr.forward(y);
    fftr.dispose();
    return transform;
}
