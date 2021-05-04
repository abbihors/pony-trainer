// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random

export function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

// Excludes max
export function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
}

export function getRandomChoice(arr) {
    return arr[getRandomInt(0, arr.length)];
}
