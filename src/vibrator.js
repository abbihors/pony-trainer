export class Vibrator {
    constructor(appName) {
        this.appName = appName;
        this.ready = false;
    }

    async connect() {
        await Buttplug.buttplugInit();

        this.client = new Buttplug.ButtplugClient(this.appName);
        this.connector = new Buttplug.ButtplugEmbeddedConnectorOptions();

        await this.client.connect(this.connector);
        this.ready = true;
    }

    async scanForToys() {
        if (!this.ready) {
            await this.connect();
        }
        await this.client.startScanning();
    }

    async vibrateFor(strength, ms) {
        for (let device of this.client.Devices) {
            await device.vibrate(strength);

            setTimeout(async () => {
                await device.stop();
            }, ms);
        }
    }
}