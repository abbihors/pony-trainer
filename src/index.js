import { SpeechRecorder } from './speech-recorder';
import { encodeWavInt16 } from './encode-wav';

import { JSZip } from 'jszip';

const SAMPLERATE = 16000;
const CHANNELS = 1;

let recorder = new SpeechRecorder({
    sampleRate: SAMPLERATE,
    channels: CHANNELS,
    recordVol: 0.04,
    maxSilenceS: 1.0,
    prevAudioS: 0.2
});

recorder.onspeech = (recording) => {
    console.log('Got a recording!');
    console.log(recording);

    prepareDownload(recording);
}

const recordButton = document.querySelector('#btn-record');
const stopButton = document.querySelector('#btn-stop');
const downloadLink = document.querySelector('#download');

recordButton.onclick = () => {
    if (!recorder.started) {
        recorder.start();
    }
};

stopButton.onclick = () => {
    recorder.stop();
};

function prepareDownload(recording) {
    const wavData = encodeWavInt16(recording, SAMPLERATE, CHANNELS);
    const blob = new Blob([wavData], { type: 'audio/wav' });
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = 'recording.wav';
}
