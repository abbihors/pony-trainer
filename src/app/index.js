import PonyTrainer from './pony-trainer';
import { getRandom, getRandomInt } from './utils/random';

let ponyTrainer = new PonyTrainer();

ponyTrainer.on('deviceadded', deviceAdded);
ponyTrainer.on('deviceremoved', deviceRemoved);
ponyTrainer.on('rewardpony', rewardPony);

const SLOPE_FACTOR = -4;

const listenButton = document.querySelector('#btn-listen');
const connectButton = document.querySelector('#btn-connect');
const playPauseButton = document.querySelector('#btn-play-pause');

const listenError = document.querySelector('#err-listen');

const intifaceConnectWrapper = document.querySelector('.wrapper-intiface');
const intifaceConnectButton = document.querySelector('#btn-intiface-connect');
const intifaceConnectError = document.querySelector('#intiface-connect-err');
const intifaceScanningInfo = document.querySelector('#intiface-scanning-info');

const reconnectWrapper = document.querySelector('.wrapper-reconnect');
const reconnectButton = document.querySelector('#btn-reconnect');

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

connectButton.onclick = connectVibrator;
reconnectButton.onclick = connectVibrator;

function bluetoothAdapterAvailable() {
    try {
        return navigator.bluetooth.getAvailability();
    } catch {
        return false;
    }
}

async function connectVibrator() {
    // Unhide device list
    const deviceList = document.querySelector('.wrapper-device-list');
    deviceList.style.display = 'inline';

    const connectError = document.querySelector('#err-connect');

    // Try Web Bluetooth first, fallback to Intiface
    const adapterAvailable = await bluetoothAdapterAvailable();

    if (adapterAvailable) {
        try {
            await ponyTrainer.findToyWebBluetooth();
            connectError.style.display = 'none';
        } catch {
            connectError.style.display = 'block';
        }
    } else {
        intifaceConnectWrapper.style.display = 'block';
    }
}

intifaceConnectButton.onclick = async () => {
    const address = document.querySelector('#intiface-addr').value;

    try {
        await ponyTrainer.findToyIntiface(address);
        intifaceScanningInfo.style.display = 'block';
        intifaceConnectError.style.display = 'none';
    } catch {
        intifaceScanningInfo.style.display = 'none';
        intifaceConnectError.style.display = 'block';
    }
}

async function deviceAdded(deviceName) {
    playPauseButton.style.visibility = 'visible';

    connectButton.style.display = 'none';
    intifaceConnectWrapper.style.display = 'none';
    reconnectWrapper.style.display = 'none';
    intifaceScanningInfo.style.display = 'none';
    intifaceConnectWrapper.style.display = 'none';

    addDeviceListEntry(deviceName);

    await ponyTrainer.play();
}

async function deviceRemoved() {
    await ponyTrainer.pause();

    removeDeviceListEntry();

    playPauseButton.style.visibility = 'hidden';
    reconnectWrapper.style.display = 'block';
}

function addDeviceListEntry(deviceName) {
    const deviceList = document.querySelector('.wrapper-device-list');

    let deviceEntry = document.createElement('div');
    let deviceLine = document.createElement('p');
    let testButton = document.createElement('button');

    deviceLine.innerText = `▸ ${deviceName}`;
    testButton.className = 'button-small';
    testButton.innerText = 'Test vibration';

    testButton.onclick = async () => {
        await ponyTrainer.testVibrate();
    }

    deviceEntry.class = 'device-entry';
    deviceEntry.append(deviceLine);
    deviceEntry.append(testButton);

    deviceList.append(deviceEntry);
}

function removeDeviceListEntry() {
    const deviceList = document.querySelector('.wrapper-device-list');

    let devices = deviceList.childNodes;
    if (devices.length > 0) {
        deviceList.removeChild(devices[0]);
    }
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

    let voicemeterWrapper = document.querySelector('.voicemeter-wrapper');

    if (vol > ponyTrainer.recorder.recordVol) {
        voicemeterWrapper.classList.add('recording');
    } else if (!ponyTrainer.recorder.isRecording()) {
        voicemeterWrapper.classList.remove('recording');
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

    let lockIcon = document.querySelector('.progressbar-icon');
    let lockMessage = document.querySelector('#lockmessage');

    // Only update if we need to update
    if (ponyTrainer.denied !== denied) {
        if (ponyTrainer.denied) {
            lockIcon.style.visibility = 'visible';
            lockMessage.style.visibility = 'visible';
            progressBar.classList.add('paused');
        } else {
            lockIcon.style.visibility = 'hidden';
            lockMessage.style.visibility = 'hidden';
            progressBar.classList.remove('paused');
        }

        denied = ponyTrainer.denied;
    }
}

setInterval(updateProgressBar, 200);

function rewardPony() {
    explodePonies();
    exciteProgressbar();
}

function exciteProgressbar() {
    let progressbarWrapper = document.querySelector('.progressbar-wrapper');

    progressbarWrapper.classList.add('excited');

    setTimeout(() => {
        progressbarWrapper.classList.remove('excited');
    }, 1100);
}

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
    let progressBar = document.querySelector('.progressbar');

    if (!paused) {
        ponyTrainer.pause();
        playPauseButton.innerHTML = 'Resume';
        progressBar.classList.add('paused');
    } else {
        ponyTrainer.play();
        playPauseButton.innerHTML = 'Pause';
        progressBar.classList.remove('paused');
    }

    paused = !paused;
}
