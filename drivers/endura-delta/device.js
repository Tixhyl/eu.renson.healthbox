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
        if (this.hasCapability('filter_days') === false) {
            await this.addCapability('filter_days');
        }

        this.getProductionData();

        this.homey.setInterval(async () => {
            await this.getProductionData();
        }, 1000 * 60 * 1);

        // Register Trigger Card
        this._filterDaysTrigger = this.homey.flow.getDeviceTriggerCard('filter_days_remaining');
        this._lastFilterDays = null;

        // Register Flow Card Actions
        this.setVentilationTimerAction = this.homey.flow.getActionCard('set_ventilation_timer');
        this.setVentilationTimerAction.registerRunListener(async (args, state) => {
            try {
                const enduraApi = new EnduraApi(this.homey.settings.get('endura_ip'));
                await enduraApi.setVentilationTimer(
                    Number(args.duration),
                    parseInt(args.level)
                );
                return true;
            } catch (error) {
                this.error('Failed to set ventilation timer:', error);
                throw error;
            }
        });

        this.stopVentilationTimerAction = this.homey.flow.getActionCard('stop_ventilation_timer');
        this.stopVentilationTimerAction.registerRunListener(async (args, state) => {
            try {
                const enduraApi = new EnduraApi(this.homey.settings.get('endura_ip'));
                await enduraApi.stopVentilationTimer();
                return true;
            } catch (error) {
                this.error('Failed to stop ventilation timer:', error);
                throw error;
            }
        });

        this.startBreezeModeAction = this.homey.flow.getActionCard('start_breeze_mode');
        this.startBreezeModeAction.registerRunListener(async (args, state) => {
            try {
                const enduraApi = new EnduraApi(this.homey.settings.get('endura_ip'));
                await enduraApi.startBreezeMode(args.duration);
                return true;
            } catch (error) {
                this.error('Failed to start breeze mode:', error);
                throw error;
            }
        });

        this.setHolidayModeAction = this.homey.flow.getActionCard('set_holiday_mode');
        this.setHolidayModeAction.registerRunListener(async (args, state) => {
            try {
                const enduraApi = new EnduraApi(this.homey.settings.get('endura_ip'));
                const [day, month, year] = args.until_date.split('-');
                const formattedDate = `${year}-${month}-${day}`;
                await enduraApi.setHolidayMode(formattedDate);
                return true;
            } catch (error) {
                this.error('Failed to set holiday mode:', error);
                throw error;
            }
        });

        this.setAutomaticBreezeAction = this.homey.flow.getActionCard('set_automatic_breeze');
        this.setAutomaticBreezeAction.registerRunListener(async (args, state) => {
            try {
                const enduraApi = new EnduraApi(this.homey.settings.get('endura_ip'));
                await enduraApi.setAutomaticBreeze(
                    args.enabled === 'true',
                    parseFloat(args.temperature),
                    parseInt(args.level)
                );
                return true;
            } catch (error) {
                this.error('Failed to set automatic breeze:', error);
                throw error;
            }
        });

    }

    async getProductionData() {
        try {
            // Log device name from settings
            console.log('Device name:', this.homey.settings.get("name"));
            
            // Get IP from settings
            let ip = this.homey.settings.get('endura_ip');
            console.log('Device IP:', ip);
    
            // Initialize API and get data
            let enduraApi = new EnduraApi(ip);
            let baseSession = await enduraApi.getData();
            const deviceData = await enduraApi.processData(baseSession);
            
            // Destructure all needed values from device data
            const [
                deviceName, 
                deviceCO2, 
                deviceIndoorAirQuality, 
                deviceCurrentVentilationLevel, 
                deviceExternalTemperature, 
                deviceInternalTemperature, 
                deviceHumidity, 
                deviceMeasuredSupAirflow, 
                deviceMeasuredEtaAirflow, 
                deviceMac, 
                deviceFilterRemainingDays
            ] = await Promise.all([
                deviceData.deviceName, 
                deviceData.CO2, 
                deviceData.indoorAirQuality, 
                deviceData.currentVentilationLevel, 
                deviceData.externalTemperature, 
                deviceData.internalTemperature, 
                deviceData.humidity, 
                deviceData.measuredSupAirflow, 
                deviceData.measuredEtaAirflow, 
                deviceData.deviceMAC, 
                deviceData.filterRemainingDays
            ]);
    
            // Update all capability values
            await this.setCapabilityValue('measure_co2.airquality', deviceIndoorAirQuality);
            await this.setCapabilityValue('measure_co2.co2', deviceCO2);
            await this.setCapabilityValue('measure_humidity', deviceHumidity);
            await this.setCapabilityValue('measure_temperature.indoor', deviceInternalTemperature);
            await this.setCapabilityValue('measure_temperature.outdoor', deviceExternalTemperature);
            await this.setCapabilityValue('measure_power.current_level', parseInt(deviceCurrentVentilationLevel.split("Level")[1]));
            await this.setCapabilityValue('measure_wind_strength.pulse_airflow', parseInt(deviceMeasuredSupAirflow));
            await this.setCapabilityValue('measure_wind_strength.eta_airflow', parseInt(deviceMeasuredEtaAirflow));
            await this.setCapabilityValue('filter_days', deviceFilterRemainingDays);
    
            // Check and trigger filter days alert if needed
            try {
                const triggerCard = this.homey.flow.getDeviceTriggerCard('filter_days_remaining');
                const args = await triggerCard.getArgumentValues(this);
                
                // Check each trigger argument
                for (const arg of args) {
                    if (deviceFilterRemainingDays <= arg.days) {
                        console.log('Triggering filter alert for', arg.days, 'days');
                        await triggerCard.trigger(this, {}, { days: arg.days });
                    }
                }
            } catch (triggerError) {
                console.error('Failed to process filter trigger:', triggerError);
            }
    
            // Set device as available if it wasn't
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
