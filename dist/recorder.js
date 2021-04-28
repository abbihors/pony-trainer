// Using NodeScriptProcessor. It's deprecated, but nothing else works so
// screw it. Probably won't be removed from browsers for a while for
// that same reason.

const SAMPLE_RATE = 16000;

let recorder;
let mediaStream;
let buffers = [];

const recordButton = document.querySelector("#btn-record");
const stopButton = document.querySelector("#btn-stop");
const downloadLink = document.querySelector("#download");

recordButton.onclick = function () {
    const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });

    // Get access to user mic
    navigator.mediaDevices.getUserMedia({ "audio": true }).then((stream) => {
        mediaStream = audioCtx.createMediaStreamSource(stream);

        const bufferSize = 2048;
        const numberOfInputChannels = 1;
        const numberOfOutputChannels = 1;

        recorder = audioCtx.createScriptProcessor(
            bufferSize, numberOfInputChannels, numberOfOutputChannels
        );

        recorder.onaudioprocess = (event) => {
            const buffer = new Float32Array(event.inputBuffer.getChannelData(0));
            buffers.push(buffer);

            if (buffers.length * bufferSize >= SAMPLE_RATE) {
                finishRecording();
            }
        }

        mediaStream.connect(recorder);
        recorder.connect(audioCtx.destination);
    });
}

stopButton.onclick = function () {
    stopRecording();
}

function stopRecording() {
    recorder.disconnect();
    mediaStream.disconnect(recorder);
    console.log("Finished recording");
}

function finishRecording() {
    stopRecording();

    let recording = flatten(buffers);
    recording = recording.slice(0, SAMPLE_RATE); // Trim

    const wavData = encodeWavInt16(recording, SAMPLE_RATE, 1);

    const blob = new Blob([wavData], { type: 'audio/wav' });
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = 'recording.wav';
}

function flatten(buffers) {
    const bufSize = buffers[0].length;
    let out = new Float32Array(bufSize * buffers.length);

    for (let i = 0; i < buffers.length; i++) {
        out.set(buffers[i], i * bufSize);
    }

    return out;
}
