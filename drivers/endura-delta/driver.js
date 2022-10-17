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
            // Example device data, note that `store` is optional
            // {
            //   name: 'My Device',
            //   data: {
            //     id: 'my-device',
            //   },
            //   store: {
            //     address: '127.0.0.1',
            //   },
            // },
        ];
    }
    onPair(session) {
        let ip;
        let enduraApi;
        let baseSession;

        session.setHandler('validate', async (data) => {
            try {
                this.homey.settings.set('endura_ip', data.ip);

                console.log("ip :");
                console.log(data.ip);
                ip = data.ip;

                enduraApi = new EnduraApi(ip);
                baseSession = await enduraApi.initializeSession();
                const deviceData = await enduraApi.processData(baseSession);
                const [deviceName] = await Promise.all([deviceData.deviceName]);

                let devices = [];

                if (deviceName && deviceName.length > 0) {
                    devices.push(
                        {
                            name: deviceName,
                            data: {
                                id: deviceName,
                                name: deviceName
                            },
                            store: {
                                name: deviceName,
                                ip: ip
                            }
                        }
                    );
                }

                this.log("Found devices:");
                this.log(devices);
                return devices;
            } catch (error) {
                this.error(error);
            }
        });



        // session.setHandler('list_devices', async (data) => {
        //     try {
        //         lunaApi = new LunaApi(username, password);
        //         const systems = await lunaApi.getSystems();
        //         console.log("systems :");
        //         console.log(systems);

        //         const devices = systems.map(item => ({
        //             name: item.stationName,
        //             data: {
        //                 id: item.stationCode,
        //                 capacity: item.capacity * 1000,
        //             },
        //             settings: { username, password }

        //         }));

        //         return devices;
        //     } catch (error) {
        //         this.error(error);
        //     }
        // });

    }


}

module.exports = MyDriver;
