import { Queue } from './utils/queue';

export default class Vibrator {
    constructor(appName, maxStrength = 1.0) {
        this.appName = appName;
        this.device = null;
        this.queue = new Queue();
        this.vibrationLevel = 0.0;
        this.maxStrength = maxStrength;
        this.timeoutOn = 0;
        this.timeoutOff = 0;
        this.connector = null;
        this.client = null;
    }

    async _initButtplugWebBluetooth() {
        await Buttplug.buttplugInit();

        this.connector = new Buttplug.ButtplugEmbeddedConnectorOptions();
        this.client = new Buttplug.ButtplugClient(this.appName);

        try {
            await this.client.connect(this.connector);
        } catch (err) {
            throw err;
        }
    }

    async _initButtplugIntifaceDesktop(address) {
        await Buttplug.buttplugInit();

        this.connector = new Buttplug.ButtplugWebsocketConnectorOptions();
        this.connector.address = `ws://${address}`;

        this.client = new Buttplug.ButtplugClient(this.appName);

        try {
            await this.client.connect(this.connector);
        } catch (err) {
            throw err;
        }
    }

    async findToysWebBluetooth() {
        await this._initButtplugWebBluetooth();
        return this.findToys();
    }

    async findToysIntifaceDesktop(address) {
        await this._initButtplugIntifaceDesktop(address);
        return this.findToys();
    }

    // Must be run in response to user gesture
    async findToys() {
        return new Promise(async (resolve) => {
            this.client.addListener("deviceremoved", (device) => {
                this.device = null;
            });

            this.client.addListener("deviceadded", (device) => {
                this.client.stopScanning();

                this.device = device;
                resolve(device.Name);
            });

            await this.client.startScanning();
        });
    }

    async _safeVibrate(strength) {
        const scaledStrength = Math.min(this.maxStrength, strength);
        await this.device.vibrate(scaledStrength);
    }

    busy() {
        return !this.queue.empty();
    }

    async setVibrationLevel(newLevel) {
        this.vibrationLevel = newLevel;
        await this._safeVibrate(newLevel);
    }

    async _restoreBackgroundLevel() {
        await this._safeVibrate(this.vibrationLevel);
    }

    async stop() {
        await this.device.stop();
    }

    async pause() {
        // Clear timeouts
        clearTimeout(this.timeoutOn);
        clearTimeout(this.timeoutOff);

        // Empty queue
        this.queue = new Queue();

        // Stop vibrator
        await this.stop();
    }

    async resume() {
        this._restoreBackgroundLevel();
    }

    async vibrate(strength, onMs, offMs) {
        this.queue.enqueue([strength, onMs, offMs]);

        if (this.queue.length === 1) {
            await this._runNextInQueue();
        }
    }

    async _runNextInQueue() {
        const cmd = this.queue.front();
        await this._vibrateFor(cmd[0], cmd[1], cmd[2]);
    }

    // Vibrates for onTime, advances queue in onTime + offTime
    async _vibrateFor(strength, onMs, offMs = 0) {
        await this._safeVibrate(strength);

        if (offMs > 0) {
            this.timeoutOn = setTimeout(async () => {
                await this._restoreBackgroundLevel();
            }, onMs);

            this.timeoutOff = setTimeout(async () => {
                this.queue.dequeue();
                if (!this.queue.empty()) {
                    await this._runNextInQueue();
                }
            }, onMs + offMs);
        } else {
            this.timeoutOn = setTimeout(async () => {
                this.queue.dequeue();
                if (!this.queue.empty()) {
                    await this._runNextInQueue();
                } else {
                    await this._restoreBackgroundLevel();
                }
            }, onMs);
        }
    }
}
