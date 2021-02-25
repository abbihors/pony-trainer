let getUserMedia = require('get-user-media-promise');
let MicrophoneStream = require('microphone-stream');
let wav = require('node-wav');

console.log('index.js loaded!');

document.getElementById('button-start').onclick = function () {
    // note: for iOS Safari, the constructor must be called in response to a tap, or else the AudioContext will remain
    // suspended and will not provide any audio data.
    let micStream = new MicrophoneStream();

    getUserMedia({ video: false, audio: true })
        .then(function (stream) {
            micStream.setStream(stream);
        }).catch(function (error) {
            console.log(error);
        });

    let chunks = [];

    // get Buffers (Essentially a Uint8Array DataView of the same Float32 values)
    micStream.on('data', function (chunk) {
        // Optionally convert the Buffer back into a Float32Array
        // (This actually just creates a new DataView - the underlying audio data is not copied or modified.)
        let rawChunk = MicrophoneStream.toRaw(chunk);

        chunks.push(rawChunk);

        // Stop after we've collected 1 second of audio
        if ((chunks.length * rawChunk.length) > micStream.context.sampleRate) {
            console.log('got 1 second');
            console.log(chunks.length);

            // create a new buffer to hold all chunks
            let tmpRecording = new Float32Array(chunks.length * rawChunk.length);

            // put all the chunks in one buffer
            for (let i = 0; i < chunks.length; i++) {
                tmpRecording.set(chunks[i], i * rawChunk.length);
            }

            // include only 1 second of audio
            let recording = tmpRecording.slice(0, micStream.context.sampleRate);

            chunks = [];

            micStream.stop();

            // write to file
            let wavBuf = wav.encode([recording], { sampleRate: 44100, float: true, bitDepth: 32 });

            let decoded = wav.decode(wavBuf);
            console.log(decoded.sampleRate);
            console.log(decoded.channelData);

            const downloadLink = document.getElementById('download');

            // BLOB CONSTRUCTOR TAKES AN ARRAY OF DATA ARRAYS WOW
            b = new Blob([wavBuf], { type: 'audio/wav' });
            downloadLink.href = URL.createObjectURL(b);
            downloadLink.download = 'js-recording.wav';
        }

        // micStream.stop();
    });

    // It also emits a format event with various details (frequency, channels, etc)
    micStream.on('format', function (format) {
        console.log(format);
    });

    // Stop when ready
    document.getElementById('button-stop').onclick = function () {
        micStream.stop();
    };
}
