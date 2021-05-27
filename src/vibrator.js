import { Queue } from './utils/queue';
import { EventEmitter } from 'events';

const VIBRATE_TIMEOUT_MS = 1000;

export default class Vibrator extends EventEmitter {
    constructor(appName, maxStrength = 1.0, scalingFactor = 1.0) {
        super();

        this.appName = appName;
        this.queue = new Queue();
        this.vibrationLevel = 0.0;
        this.timeoutOn = 0;
        this.timeoutOff = 0;

        // Safety features
        this.maxStrength = maxStrength;
        this.scalingFactor = scalingFactor;

        this.connector = null;
        this.client = null;

        this.connected = false;
    }

    // Propagate events upwards
    addEventListeners() {
        this.client.addListener('deviceadded', (device) => {
            if (this.client._isScanning) {
                this.client.stopScanning();
            }
            this.emit('deviceadded', device.Name);
        });

        this.client.addListener('deviceremoved', () => {
            this.emit('deviceremoved');
        });
    }

    async _connectButtplugWebBluetooth() {
        await Buttplug.buttplugInit();

        this.connector = new Buttplug.ButtplugEmbeddedConnectorOptions();
        this.client = new Buttplug.ButtplugClient(this.appName);

        try {
            await this.client.connect(this.connector);
        } catch (err) {
            throw err;
        }

        this.connected = true;
        this.addEventListeners();
    }

    async _connectButtplugIntiface(address) {
        await Buttplug.buttplugInit();

        this.connector = new Buttplug.ButtplugWebsocketConnectorOptions();
        this.connector.address = `ws://${address}`;

        this.client = new Buttplug.ButtplugClient(this.appName);

        try {
            await this.client.connect(this.connector);
        } catch (err) {
            throw err;
        }

        this.connected = true;
        this.addEventListeners();
    }

    // Must be run in response to user gesture
    async scanDevicesWebBluetooth() {
        if (!this.connected) {
            await this._connectButtplugWebBluetooth();
        }
        await this.client.startScanning();
    }

    async scanDevicesIntiface(address) {
        if (!this.connected) {
            await this._connectButtplugIntiface(address);
        }
        await this.client.startScanning();
    }

    async _vibrateTimeout(strength) {
        let vibratePromise = this.client.Devices[0].vibrate(strength);

        let timeoutPromise = new Promise((resolve, reject) => {
            setTimeout(reject, VIBRATE_TIMEOUT_MS);
        });

        return Promise.race([vibratePromise, timeoutPromise]).catch((err) => {
            if (this.connected) {
                this.connected = false;
                this.client.disconnect();
                this.emit('deviceremoved');
            }
        });
    }

    async _safeVibrate(strength) {
        let scaledStrength = 0;

        if (strength > 0) {
            scaledStrength = Math.max(0.05, strength * this.scalingFactor);
            scaledStrength = Math.min(this.maxStrength, scaledStrength);
        }
        
        await this._vibrateTimeout(scaledStrength);
    }

    busy() {
        return !this.queue.empty();
    }

    async setVibrationLevel(newLevel) {
        this.vibrationLevel = newLevel;
        await this._vibrateTimeout(newLevel);
    }

    async _restoreBackgroundLevel() {
        await this._vibrateTimeout(this.vibrationLevel);
    }

    async stop() {
        await this.client.Devices[0].stop();
    }

    async pause() {
        // Clear timeouts
        clearTimeout(this.timeoutOn);
        clearTimeout(this.timeoutOff);

        // Empty queue
        this.queue = new Queue();

        // Pause vibrator but only if we have one, this allows pausing
        // e.g. if device was disconnected
        if (this.connected && this.client.Devices.length > 0) {
            await this.stop();
        }
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
