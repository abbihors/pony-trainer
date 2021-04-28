// Using NodeScriptProcessor. It's deprecated, but nothing else works so
// screw it. Probably won't be removed from browsers for a while for
// that same reason.

const SAMPLE_RATE = 16000;

let recorder;

const recordButton = document.querySelector("#btn-record");
const stopButton = document.querySelector("#btn-stop");

recordButton.onclick = function () {
    const audioCtx = new AudioContext({ sampleRate: 16000 });

    // Get access to user mic
    navigator.mediaDevices.getUserMedia({ "audio": true }).then((stream) => {
        mediaStream = audioCtx.createMediaStreamSource(stream);

        const bufferSize = 2048;
        const numberOfInputChannels = 1;
        const numberOfOutputChannels = 1;

        recorder = audioCtx.createScriptProcessor(
            bufferSize, numberOfInputChannels, numberOfOutputChannels
        );

        recorder.onaudioprocess = (e) => {
            const samples = e.inputBuffer.getChannelData(0);
            console.log(samples);
        }

        mediaStream.connect(recorder);

        recorder.connect(audioCtx.destination);
    });
}

stopButton.onclick = function () {
    recorder.disconnect();
    mediaStream.disconnect(recorder);
}
