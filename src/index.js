import PonyTrainer from './pony-trainer';

let ponyTrainer = new PonyTrainer();

const SLOPE_FACTOR = -4;

const listenButton = document.querySelector('#btn-listen');

listenButton.onclick = () => {
    const wrapperListen = document.querySelector('.wrapper-listen');

    wrapperListen.style.display = 'inline-block';
    listenButton.disabled = true;
    listenButton.style.display = 'none';
}

const slider = document.querySelector('#threshold');
let recordVol = document.querySelector('.voicemeter-recordvol');

recordVol.style.transform = `translateX(${islope(0.5, SLOPE_FACTOR) * 246}px)`;
slider.value = islope(0.5, SLOPE_FACTOR);

slider.oninput = (e) => {
    const newValue = e.target.value * 246;

    let recordVol = document.querySelector('.voicemeter-recordvol');

    ponyTrainer.recorder.recordVol = islope(e.target.value, SLOPE_FACTOR);
    console.log(ponyTrainer.recorder.recordVol);

    recordVol.style.transform = `translateX(${newValue}px)`;
}

const connectButton = document.querySelector('#btn-connect');

connectButton.onclick = () => {
    const results = document.querySelector('.wrapper-results');

    results.style.display = 'inline';

    // FIND TOYS
    ponyTrainer.start();
}

function updateVolume() {
    const vol = ponyTrainer.recorder.volume;

    const percentage = slope(vol, SLOPE_FACTOR) * 100;

    // update voice meter
    const meter = document.querySelector('.voicemeter');
    meter.style.width = `${percentage}%`;

    let wrapper = document.querySelector('.voicemeter-wrapper');

    if (vol > ponyTrainer.recorder.recordVol) {
        wrapper.style.filter = 'drop-shadow(0 0 4px #00aa00)';
    } else if (!ponyTrainer.recorder.isRecording()){
        wrapper.style.filter = '';
    }
}

setInterval(updateVolume, 50);

function deviceAdded(deviceName) {
    const results = document.querySelector('.wrapper-results');
    let deviceLine = document.createElement('p');
    let testButton = document.createElement('button');

    deviceLine.innerText = `▸ ${deviceName}`;
    testButton.className = 'pt-button-test';
    testButton.innerText = 'Test vibration';

    results.append(deviceLine);
    results.append(testButton);
}

// let recordVolume = 0.04;
// recordVolSlider.value = recordVolume;
// recordVolBox.value = recordVolume;

// scanButton.addEventListener('click', () => {
//     ponyTrainer.findToys().then(() => {
//         scanButton.disabled = false;
//         pauseButton.disabled = false;
//     });
// });

// startButton.addEventListener('click', () => {
//     ponyTrainer.start();
// });

// pauseButton.addEventListener('click', () => {
//     ponyTrainer.pause();
// });

function slope(x, k) {
    return (Math.exp(k * x) - 1) / (Math.exp(k) - 1);
}

function islope(x, k) {
    return Math.log((x * (Math.exp(k) - 1)) + 1) / k;
}