// const { performance } = require('perf_hooks');
let tf = require('@tensorflow/tfjs');
const FFT = require('fft.js');

// Benchmark function f by running it numIters times and printing the
// average time the function took to run
function benchmark(numIters, f) {
    let sum = 0;

    for (let i = 0; i < numIters; i++) {
        const t0 = performance.now();
        f();
        const t1 = performance.now();

        const delta = t1 - t0;
        sum += delta;

        // Print an estimate for the total benchmark time after 10 iters
        if (i === 10) {
            const estimate = (sum / i) * (numIters - i);
            const estimateSecs = (estimate / 1000).toFixed(1);
            console.log(`estimated benchmark time: ${estimateSecs} s`);
        }
    }

    const avgTime = sum / numIters;
    const avgMs = avgTime.toFixed(2);
    
    console.log(`'${f.name}' took ${avgMs} ms over ${numIters} iterations`);
}

function foobar() {
    let sum = 1;

    for (let i = 0; i < 10000000; i++) {
        sum += i * sum;
    }

    return sum;
}

// benchmark(100, foobar);

let sr = 4096;
let arr = [];


let input = new Array(4096);
// input.fill(0);

for (let i = 0; i < sr; i++) {
    input[i] = Math.random();
}

const f = new FFT(512);
// const input = new Array(4096);
// const realInput = new Array(f.size);
// f.realTransform(out, arr);
const out = f.createComplexArray();

// for (let i = 0; i < sr; i++) {
//     arr.push(Math.random());
// }

function stft(    signal, frameLength, frameStep, fftLength,    signalWindow = tf.signal.hannWindow) {
    // I removed fftlength check for simplicity
    const framedSignal = tf.signal.frame(signal, frameLength, frameStep);
    const windowedSignal = tf.mul(framedSignal, signalWindow(fftLength));

    return  tf.spectral.rfft(windowedSignal, frameLength);
}

function fftjs_stft(    signal, frameLength, frameStep, fftLength,    signalWindow = tf.signal.hannWindow) {
    const framedSignal = tf.signal.frame(signal, frameLength, frameStep);
    const windowedSignal = tf.mul(framedSignal, signalWindow(fftLength));

    let framed = windowedSignal.arraySync();

    const f = new FFT(512);
    let out = f.createComplexArray();

    let out_arr = [];

    for (let frame of framed) {
        f.realTransform(out, frame);
        out_arr.push(out);
    }

    return out_arr;
}

let t = tf.tensor(input);

let start = Date.now();
let out2 = fftjs_stft(t, 512, 512/4, 512);
// f.realTransform(out, input);
// f.completeSpectrum(out);
let delta = Date.now() - start;
console.log(`FFT.js took: ${delta} ms`);


let start2 = Date.now();
let ft = tf.signal.stft(t, 512, 512 / 4, 512);
let delta2 = Date.now() - start2;
console.log(`tf.js took: ${delta2} ms`);


let start3 = performance.now();
let ft2 = stft(t, 512, 512/4, 512);
let delta3 = performance.now() - start3;
console.log(`modified tf.js took: ${delta3} ms`);

console.log(out2)

console.log(ft.shape)
console.log(ft2.shape)
ft2.print()
// console.log(tf.real(ft2).arraySync())