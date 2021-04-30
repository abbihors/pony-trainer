import { SpeechRecorder } from './speech-recorder';
import { encodeWavInt16 } from './encode-wav';

import { JSZip } from 'jszip';

const SAMPLE_RATE = 16000;
const CHANNELS = 1;

const RECORD_THRESHOLD = 0.04;
const MAX_SILENCE_S = 1.0;
const PREV_AUDIO_S = 0.2;

let recorder = new SpeechRecorder(
    SAMPLE_RATE, CHANNELS, RECORD_THRESHOLD, MAX_SILENCE_S, PREV_AUDIO_S
);

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
    const wavData = encodeWavInt16(recording, SAMPLE_RATE, CHANNELS);
    const blob = new Blob([wavData], { type: 'audio/wav' });
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = 'recording.wav';
}
