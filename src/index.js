import PonyTrainer from './pony-trainer';

let ponyTrainer = new PonyTrainer();

const SLOPE_FACTOR = -4;

const listenButton = document.querySelector('#btn-listen');

listenButton.onclick = () => {
    const wrapperListen = document.querySelector('.wrapper-listen');

    wrapperListen.style.display = 'inline-block';
    listenButton.disabled = true;
    listenButton.style.display = 'none';

    ponyTrainer.startListening();
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
    // Unhide device list
    const deviceList = document.querySelector('.wrapper-device-list');
    deviceList.style.display = 'inline';

    ponyTrainer.findToys().then((deviceName) => {
        deviceAdded(deviceName);
        ponyTrainer.start();
    });
}

function deviceAdded(deviceName) {
    const results = document.querySelector('.wrapper-device-list');
    let deviceLine = document.createElement('p');
    let testButton = document.createElement('button');

    testButton.onclick = async () => {
        await ponyTrainer.testVibrate();
    }

    deviceLine.innerText = `▸ ${deviceName}`;
    testButton.className = 'pt-button-test';
    testButton.innerText = 'Test vibration';

    results.append(deviceLine);
    results.append(testButton);
}

let volumeMeterLevel = 0;

function updateVolumeMeter() {
    const vol = ponyTrainer.recorder.volume;

    let newVol = slope(vol, SLOPE_FACTOR) * 100;

    if (newVol < 1) {
        newVol = 0;
    }

    if (Math.abs(volumeMeterLevel - newVol) > 1) {
        volumeMeterLevel = newVol;
        const meter = document.querySelector('.voicemeter');
        meter.style.width = `${newVol}%`;
    }

    let wrapper = document.querySelector('.voicemeter-wrapper');

    if (vol > ponyTrainer.recorder.recordVol) {
        wrapper.style.filter = 'drop-shadow(0 0 4px #00aa00)';
    } else if (!ponyTrainer.recorder.isRecording()) {
        wrapper.style.filter = '';
    }
}

setInterval(updateVolumeMeter, 50);

function slope(x, k) {
    return (Math.exp(k * x) - 1) / (Math.exp(k) - 1);
}

function islope(x, k) {
    return Math.log((x * (Math.exp(k) - 1)) + 1) / k;
}

let barPercentage = 0;

function updateProgressBar() {
    const level = ponyTrainer.vibrator.vibrationLevel;

    let progressBar = document.querySelector('.progressbar');
    const percentage = (level / ponyTrainer.maxBackgroundStrength) * 100;
    const percentageStr = `${percentage}%`;
    
    if (percentage !== barPercentage) {
        barPercentage = percentage;
        progressBar.style.width = percentageStr;
    }

    if (!ponyTrainer.denied && progressBar.style.backgroundColor !== 'rgb(0, 194, 123)') {
        progressBar.style.backgroundColor = 'rgb(0, 194, 123)';
    }

    if (ponyTrainer.denied && progressBar.style.backgroundColor !== 'rgb(171, 171, 171)') {
        progressBar.style.backgroundColor = 'rgb(171, 171, 171)';
    }
}

setInterval(updateProgressBar, 200);
