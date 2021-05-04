import { Queue } from './queue';

export default class Vibrator {
    constructor(appName, maxStrength = 1.0) {
        this.appName = appName;
        this.queue = new Queue();
        this.vibrationLevel = 0.0;
        this.maxStrength = maxStrength;
    }

    async _initButtplug() {
        await Buttplug.buttplugInit();

        this.client = new Buttplug.ButtplugClient(this.appName);
        this.connector = new Buttplug.ButtplugEmbeddedConnectorOptions();

        await this.client.connect(this.connector);
    }

    // Must be run in response to user gesture
    async findToys() {
        await this._initButtplug();
        await this.client.startScanning();

        return new Promise((resolve) => {
            this.client.addListener("deviceadded", async (device) => {
                this.device = device;
                resolve();
            });
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

    async stop() {
        await this.device.stop();
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
            setTimeout(async () => {
                await this._safeVibrate(this.vibrationLevel);
            }, onMs);

            setTimeout(async () => {
                this.queue.dequeue();
                if (!this.queue.empty()) {
                    await this._runNextInQueue();
                }
            }, onMs + offMs);
        } else {
            setTimeout(async () => {
                this.queue.dequeue();
                if (!this.queue.empty()) {
                    await this._runNextInQueue();
                } else {
                    await this._safeVibrate(this.vibrationLevel);
                }
            }, onMs);
        }
    }
}
