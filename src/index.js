import PonyTrainer from './pony-trainer';

let ponyTrainer = new PonyTrainer();

const listenButton = document.querySelector('#btn-listen');

listenButton.onclick = () => {
    const wrapperListen = document.querySelector('.wrapper-listen');

    wrapperListen.style.display = 'inline-block';
    listenButton.disabled = true;
    listenButton.style.display = 'none';
}

const connectButton = document.querySelector('#btn-connect');

connectButton.onclick = () => {
    const results = document.querySelector('.wrapper-results');

    results.style.display = 'inline';
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
