export class Vibrator {
    constructor(appName) {
        this.appName = appName;
    }

    async connect() {
        await Buttplug.buttplugInit();

        this.client = new Buttplug.ButtplugClient(this.appName);
        this.connector = new Buttplug.ButtplugEmbeddedConnectorOptions();

        await this.client.connect(this.connector);
    }

    get ready() {
        if (this.client === undefined) {
            return false;
        } else {
            return true;
        }
    }

    async scanForToys() {
        if (!this.ready) {
            await this.connect();
        }
        await this.client.startScanning();
    }

    async vibrateFor(strength, ms) {
        console.log(this.client);
        if (!this.ready) return;
        
        for (let device of this.client.Devices) {
            await device.vibrate(strength);

            setTimeout(async () => {
                await device.stop();
            }, ms);
        }
    }
}