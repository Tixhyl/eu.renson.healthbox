'use strict';

const { Driver } = require('homey');
const { EnduraApi } = require('./api');

class MyDriver extends Driver {

    /**
     * onInit is called when the driver is initialized.
     */
    async onInit() {
        this.log('MyDriver has been initialized');
    }

    /**
     * onPairListDevices is called when a user is adding a device
     * and the 'list_devices' view is called.
     * This should return an array with the data of devices that are available for pairing.
     */
    async onPairListDevices() {
        return [

        ];
    }
    onPair(session) {
        this.log("onPair()");
        this.settingsData = {
            "ip": ""
        };

        session.setHandler("list_devices", async () => {
            return await this.onPairListDevices(session);
        });

        session.setHandler("check", async (data) => {
            return await this.onCheck(data);
        });

        session.setHandler("settingsChanged", async (data) => {
            return await this.onSettingsChanged(data);
        });

        session.setHandler("getSettings", async () => {
            this.log("getSettings: ");
            this.log(this.settingsData);
            return this.settingsData;
        });

    }

    async onCheck(data) {
        this.log("Event Check: ");
        this.log(data);
        let enduraApi;
        this.settingsData = data;

        enduraApi = new EnduraApi(data.ip);

        try {
            if (await enduraApi.initializeSession()) {
                return this.homey.__("pair.endura.connection_ok");
            } else {
                return this.homey.__("pair.endura.connection_error");
            }
        }
        catch (error) {
            return this.homey.__("pair.endura.connection_error") + ': ' + error.message;
        }
    }
    async onSettingsChanged(data) {
        this.log("Event settingsChanged: ");
        this.log(data);
        this.settingsData = data;
        return true;
    }

    async onPairListDevices(session) {
        this.log("onPairListDevices()");
        let devices = [];
        let enduraApi = new EnduraApi(this.settingsData.ip);
        let baseSession = await enduraApi.getData();
        const deviceData = await enduraApi.processData(baseSession);
        const [deviceName, deviceMac] = await Promise.all([deviceData.deviceName, deviceData.deviceMAC]);

        this.homey.settings.set('name', deviceName);
        this.homey.settings.set('endura_ip', this.settingsData.ip);


        if (deviceName && deviceName.length > 0) {
            devices.push(
                {
                    name: deviceName,
                    data: {
                        id: deviceMac
                    }
                }
            );
        }

        this.log("Found devices:");
        this.log(devices);
        return devices;
    }

}

module.exports = MyDriver;
