import PonyTrainer from './pony-trainer';
import { getRandom, getRandomInt } from './utils/random';

const COLOR_ACCENT = '#00c27b';
const COLOR_PROGRESSBAR_DISABLED = '#d6d6d6';

let ponyTrainer = new PonyTrainer();

ponyTrainer.onRewardPony = explodePonies;

const SLOPE_FACTOR = -4;

const listenButton = document.querySelector('#btn-listen');
const connectButton = document.querySelector('#btn-connect');
const playPauseButton = document.querySelector('#btn-play-pause');

const listenError = document.querySelector('#err-listen');

listenButton.onclick = () => {
    ponyTrainer.startListening().then(() => {
        const wrapperListen = document.querySelector('.wrapper-listen');

        wrapperListen.style.display = 'inline-block';
        listenButton.disabled = true;
        listenButton.style.display = 'none';

        listenError.style.display = 'none';
    }).catch((err) => {
        console.log(err);
        listenError.style.display = 'block';
    });
}

const slider = document.querySelector('#threshold');
let recordVol = document.querySelector('.voicemeter-recordvol');

recordVol.style.transform = `translateX(${islope(0.5, SLOPE_FACTOR) * 246}px)`;
slider.value = islope(0.5, SLOPE_FACTOR);

slider.oninput = (e) => {
    const newValue = e.target.value * 246;

    let recordVol = document.querySelector('.voicemeter-recordvol');

    ponyTrainer.recorder.recordVol = islope(e.target.value, SLOPE_FACTOR);

    recordVol.style.transform = `translateX(${newValue}px)`;
}

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
    playPauseButton.style.visibility = 'visible';

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
let denied = false;

function updateProgressBar() {
    const level = ponyTrainer.vibrator.vibrationLevel;

    let progressBar = document.querySelector('.progressbar');
    const percentage = (level / ponyTrainer.maxBackgroundStrength) * 100;
    const percentageStr = `${percentage}%`;

    if (percentage !== barPercentage) {
        progressBar.style.width = percentageStr;
        barPercentage = percentage;
    }

    let icon = document.querySelector('.progressbar-icon');

    // Only update if we need to update
    if (ponyTrainer.denied !== denied) {
        if (ponyTrainer.denied) {
            icon.style.visibility = 'visible';
            progressBar.style.backgroundColor = COLOR_PROGRESSBAR_DISABLED;
        } else {
            icon.style.visibility = 'hidden';
            progressBar.style.backgroundColor = COLOR_ACCENT;
        }

        denied = ponyTrainer.denied;
    }
}

setInterval(updateProgressBar, 200);

function explodePonies() {
    const numPonies = getRandomInt(10, 16);
    const numHearts = getRandomInt(3, 6);

    // Create ponies and give them random directions
    for (let i = 0; i < numPonies; i++) {
        let ponyElem = createExplodingEmoji('🐴');
        document.body.appendChild(ponyElem);
    }

    for (let i = 0; i < numHearts; i++) {
        let heartElem = createExplodingEmoji('💙');
        document.body.appendChild(heartElem);
    }

    // Delete them when done
    setTimeout(() => {
        let ponies = document.querySelectorAll('.floating');

        for (let i = 0; i < ponies.length; i++) {
            document.body.removeChild(ponies[i]);
        }
    }, 1000);
}

function createExplodingEmoji(text) {
    let elem = document.createElement('div');

    elem.className = 'floating';
    elem.innerHTML = text;

    const scaleFactor = 400;
    let randomX = getRandom(-1, 1) * scaleFactor;
    let randomY = getRandom(-1, 1) * scaleFactor;

    elem.animate([
        {
            transform: 'translateX(0px) translateY(0px)',
            opacity: 1
        },
        {
            opacity: 0.8
        },
        {
            opacity: 0.7
        },
        {
            transform: `translateX(${randomX}px) translateY(${randomY}px)`,
            opacity: 0
        }], {
        fill: 'forwards',
        easing: 'ease-out',
        duration: 1000,
        iterations: 1,
    });

    return elem;
}

let paused = false;

playPauseButton.onclick = () => {
    if (!paused) {
        ponyTrainer.pause();
        playPauseButton.innerHTML = 'Resume';
    } else {
        ponyTrainer.resume();
        playPauseButton.innerHTML = 'Pause';
    }

    paused = !paused;
}
