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
        
        // List of device capabilities
        const requiredCapabilities = [
            'measure_co2.airquality',
            'measure_co2.co2',
            'measure_co2.indoorairquality',
            'measure_humidity',
            'measure_temperature.indoor',
            'measure_temperature.outdoor',
            'measure_power.current_level',
            'measure_wind_strength.pulse_airflow',
            'measure_wind_strength.eta_airflow',
            'measure_wind_strength.nominal_airflow',
            'bypass_active',
            'frost_protection_active',
            'preheater_active',
            'breeze_active',
            'filter_days'
        ];

        // Adding missing capabilities
        for (const capability of requiredCapabilities) {
            if (!this.hasCapability(capability)) {
                await this.addCapability(capability);
            }
        }

        this.getProductionData();

        this.homey.setInterval(async () => {
            await this.getProductionData();
        }, 1000 * 60 * 1);

        //Register listener for filter days
        this.registerCapabilityListener('filter_days', async (value) => {
            try {
                const triggerCard = this.homey.flow.getDeviceTriggerCard('filter_days_remaining');
                const args = await triggerCard.getArgumentValues(this);
                
                // Kontrola každého trigger argumentu
                for (const arg of args) {
                    if (value === arg.days) { // Změnili jsme podmínku na přesnou shodu
                        this.log('Triggering filter alert for', arg.days, 'days');
                        await triggerCard.trigger(this, {}, { days: arg.days });
                    }
                }
            } catch (error) {
                this.error('Failed to process filter trigger:', error);
            }
            
            // Musíme vrátit Promise
            return Promise.resolve();
        });
        
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
                deviceFilterRemainingDays,
                deviceTotalNominalAirflow,
                deviceBypassLevel,
                deviceFrostProtectionActive,
                devicePreheaterEnabled,
                deviceBreezeConditionsMet
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
                deviceData.filterRemainingDays,
                deviceData.totalNominalAirflow,
                deviceData.bypassLevel,
                deviceData.frostProtectionActive,
                deviceData.preheaterEnabled,
                deviceData.breezeConditionsMet
            ]);
    
            // Update all capability values
            await this.setCapabilityValue('measure_co2.airquality', deviceIndoorAirQuality);
            await this.setCapabilityValue('measure_co2.co2', deviceCO2);
            await this.setCapabilityValue('measure_co2.indoorairquality', deviceIndoorAirQuality);
            await this.setCapabilityValue('measure_humidity', deviceHumidity);
            await this.setCapabilityValue('measure_temperature.indoor', deviceInternalTemperature);
            await this.setCapabilityValue('measure_temperature.outdoor', deviceExternalTemperature);
            await this.setCapabilityValue('measure_power.current_level', parseInt(deviceCurrentVentilationLevel.split("Level")[1]));
            await this.setCapabilityValue('measure_wind_strength.pulse_airflow', parseInt(deviceMeasuredSupAirflow));
            await this.setCapabilityValue('measure_wind_strength.eta_airflow', parseInt(deviceMeasuredEtaAirflow));
            await this.setCapabilityValue('measure_wind_strength.nominal_airflow', parseInt(deviceTotalNominalAirflow));
            await this.setCapabilityValue('filter_days', deviceFilterRemainingDays);
    
            // Update boolean states
            await this.setCapabilityValue('bypass_active', deviceBypassLevel === "1");
            await this.setCapabilityValue('frost_protection_active', deviceFrostProtectionActive === "1");
            await this.setCapabilityValue('preheater_active', devicePreheaterEnabled === "1");
            await this.setCapabilityValue('breeze_active', deviceBreezeConditionsMet === "1");
    
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
