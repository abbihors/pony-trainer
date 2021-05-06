import PonyTrainer from './pony-trainer';

let ponyTrainer = new PonyTrainer();

const listenButton = document.querySelector('#btn-listen');

listenButton.onclick = () => {
    const wrapperListen = document.querySelector('.wrapper-listen');

    wrapperListen.style.display = 'inline-block';
    listenButton.disabled = true;
    listenButton.style.display = 'none';
}

const slider = document.querySelector('#threshold');

slider.oninput = () => {
    let recordVol = document.querySelector('.voicemeter-recordvol');

    recordVol.style.transform = 'translateX(80px)';
}

const connectButton = document.querySelector('#btn-connect');

connectButton.onclick = () => {
    const results = document.querySelector('.wrapper-results');

    results.style.display = 'inline';

    // FIND TOYS
}

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
