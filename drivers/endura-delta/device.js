'use strict';

const { Device } = require('homey');
const { EnduraApi } = require('./api');

class MyDevice extends Device {

    /**
     * onInit is called when the device is initialized.
     */
    async onInit() {
        this.log('MyDevice has been initialized');


        await this.setSettings({
            name: this.homey.settings.get('name'),
            endura_ip: this.homey.settings.get('endura_ip'),
        });
        if (this.hasCapability('measure_co2.airquality') === false) {
            await this.addCapability('measure_co2.airquality');
        }
        if (this.hasCapability('measure_co2.co2') === false) {
            await this.addCapability('measure_co2.co2');
        }
        if (this.hasCapability('measure_humidity') === false) {
            await this.addCapability('measure_humidity');
        }
        if (this.hasCapability('measure_temperature.indoor') === false) {
            await this.addCapability('measure_temperature.indoor');
        }
        if (this.hasCapability('measure_temperature.outdoor') === false) {
            await this.addCapability('measure_temperature.outdoor');
        }
        if (this.hasCapability('measure_power.current_level') === false) {
            await this.addCapability('measure_power.current_level');
        }
        if (this.hasCapability('measure_wind_strength.pulse_airflow') === false) {
            await this.addCapability('measure_wind_strength.pulse_airflow');
        }
        if (this.hasCapability('measure_wind_strength.eta_airflow') === false) {
            await this.addCapability('measure_wind_strength.eta_airflow');
        }

        this.getProductionData();

        this.homey.setInterval(async () => {
            await this.getProductionData();
        }, 1000 * 60 * 1);

    }

    async getProductionData() {
        try {
            console.log(this.homey.settings.get("name"));
            // const settings = this.getSettings();
            let ip = this.homey.settings.get('endura_ip');

            console.log(ip);

            let enduraApi = new EnduraApi(ip);
            let baseSession = await enduraApi.getData();
            const deviceData = await enduraApi.processData(baseSession);
            const [deviceName, deviceCO2, deviceIndoorAirQuality, deviceCurrentVentilationLevel, deviceExternalTemperature, deviceInternalTemperature, deviceHumidity, deviceMeasuredSupAirflow, deviceMeasuredEtaAirflow, deviceMac] = await Promise.all([deviceData.deviceName, deviceData.CO2, deviceData.indoorAirQuality, deviceData.currentVentilationLevel, deviceData.externalTemperature, deviceData.internalTemperature, deviceData.humidity, deviceData.measuredSupAirflow, deviceData.measuredEtaAirflow, deviceData.deviceMAC]);

            await this.setCapabilityValue('measure_co2.airquality', deviceIndoorAirQuality);
            await this.setCapabilityValue('measure_co2.co2', deviceCO2);
            await this.setCapabilityValue('measure_humidity', deviceHumidity);
            await this.setCapabilityValue('measure_temperature.indoor', deviceInternalTemperature);
            await this.setCapabilityValue('measure_temperature.outdoor', deviceExternalTemperature);
            await this.setCapabilityValue('measure_power.current_level', parseInt(deviceCurrentVentilationLevel.split("Level")[1]));
            await this.setCapabilityValue('measure_wind_strength.pulse_airflow', parseInt(deviceMeasuredSupAirflow));
            await this.setCapabilityValue('measure_wind_strength.eta_airflow', parseInt(deviceMeasuredEtaAirflow));


            if (!this.getAvailable()) {
                await this.setAvailable();
            }
        } catch (error) {
            this.error(`Unavailable (${error})`);
            this.setUnavailable(`Error retrieving data (${error})`);
        }
    }

    /**
     * onAdded is called when the user adds the device, called just after pairing.
     */
    async onAdded() {
        this.log('MyDevice has been added');
    }

    /**
     * onSettings is called when the user updates the device's settings.
     * @param {object} event the onSettings event data
     * @param {object} event.oldSettings The old settings object
     * @param {object} event.newSettings The new settings object
     * @param {string[]} event.changedKeys An array of keys changed since the previous version
     * @returns {Promise<string|void>} return a custom message that will be displayed
     */
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        this.log('MyDevice settings where changed');
        console.log(changedKeys);
        console.log(newSettings);

        for (const key in newSettings) {
            this.homey.settings.set(key, newSettings[key]);
            console.log(`${key}: ${newSettings[key]}`);
        }
        this.getProductionData();
    }

    /**
     * onRenamed is called when the user updates the device's name.
     * This method can be used this to synchronise the name to the device.
     * @param {string} name The new name
     */
    async onRenamed(name) {
        this.log('MyDevice was renamed');
    }

    /**
     * onDeleted is called when the user deleted the device.
     */
    async onDeleted() {
        this.log('MyDevice has been deleted');
    }

}

module.exports = MyDevice;
