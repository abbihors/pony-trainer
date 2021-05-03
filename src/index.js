import PonyTrainer from './pony-trainer';

let ponyTrainer = new PonyTrainer();

const scanButton = document.querySelector('#btn-scan');
const startButton = document.querySelector('#btn-start');
const pauseButton = document.querySelector('#btn-pause');

const recordCheckbox = document.querySelector('#save-samples');
const recordVolSlider = document.querySelector('#record-vol-slider');

const recordVolBox = document.querySelector('#record-vol-box');
const indicatorCanvas = document.querySelector('#record-indicator');

let recordVolume = 0.04;
recordVolSlider.value = recordVolume;
recordVolBox.value = recordVolume;

scanButton.addEventListener('click', () => {
    ponyTrainer.findToys().then(() => {
        scanButton.disabled = false;
        pauseButton.disabled = false;
    });
});

startButton.addEventListener('click', () => {
    ponyTrainer.start();
});

pauseButton.addEventListener('click', () => {
    ponyTrainer.pause();
});

// recordCheckbox.addEventListener('click', () => {
//     downloadButton.disabled = !recordCheckbox.checked;
// });

// recordVolSlider.addEventListener('input', (e) => {
//     const vol = e.target.value;
//     recorder.recordVol = vol;
//     recordVolBox.value = vol;
// });

// recordVolBox.addEventListener('change', (e) => {
//     const vol = e.target.value;
//     recorder.recordVol = vol;
//     recordVolSlider.value = vol;
// });

const ctx = indicatorCanvas.getContext('2d');
ctx.fillStyle = 'grey';
ctx.fillRect(5, 5, 20, 20);

startButton.addEventListener('click', () => {
    const ctx = indicatorCanvas.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.fillRect(5, 5, 20, 20);
});

pauseButton.addEventListener('click', () => {
    const ctx = indicatorCanvas.getContext('2d');
    ctx.fillStyle = 'grey';
    ctx.fillRect(5, 5, 20, 20);
});
