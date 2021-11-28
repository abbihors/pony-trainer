import { getRandom } from './utils/random';

// Patterns are in the form: [strength, onMs, offMs]
// this needs to be a function to allow random numbers to work
export const getPatterns = function () {
    return {
        "Basic": {
            weight: 9,
            cmds: [
                [getRandom(0.4, 1.0), 1300, 200]
            ]
        },
        "Burst": {
            weight: 1,
            cmds: [
                [0.8, 1200, 200],
                [0.8, 1200, 200],
                [0.8, 1200, 200],
            ]
        },
        "Pulse": {
            weight: 1,
            cmds: [
                [0.8, 100, 100],
                [0.8, 100, 100],
                [0.8, 100, 100],
                [0.8, 100, 100],
            ]
        },
        "Burst Linger": {
            weight: 1,
            cmds: [
                [1.0, 700, 200],
                [1.0, 700, 200],
                [1.0, 700, 200],
                [1.0, 1700, 200],
            ]
        },
        "Rising": {
            weight: 1,
            cmds: repeat([
                [0.3, 100, 0],
                [0.4, 100, 0],
                [0.5, 100, 0],
                [0.6, 100, 0],
                [0.7, 100, 0],
                [0.8, 100, 0],
                [0.9, 100, 0],
                [1.0, 300, 200],
            ], 3)
        }
    }
}

function repeat(pattern, times) {
    let arr = [];

    for (let i = 0; i < times; i++) {
        arr = arr.concat(pattern);
    }

    return arr;
}
