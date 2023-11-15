'use strict';

const { Device } = require('homey');
const axios = require('axios');

class MyDevice extends Device {

  getSeconds(time) {
    switch (time) {
      case '15m':
        return 60 * 15;
      case '1h':
        return 60 * 60;
      case '2h':
        return 60 * 60 * 2;
      case '5h':
        return 60 * 60 * 5;
      case '8h':
        return 60 * 60 * 8;
      case '12h':
        return 60 * 60 * 12;
      default:
        return 15;
    }
  }

  getTime(seconds) {
    switch (seconds) {
      case 60 * 15:
        return '15m';
      case 60 * 60 * 1:
        return '1h';
      case 60 * 60 * 2:
        return '2h';
      case 60 * 60 * 5:
        return '5h';
      case 60 * 60 * 8:
        return '8h';
      case 60 * 60 * 12:
        return '12h';
      default:
        return '15m';
    }
  }

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
  
    this.log("Settings", this.getName(), this.homey.settings.get('ip'))

    if (!this.hasCapability('measure_airqualityindex')) {
      await this.addCapability('measure_airqualityindex');
    }

    if (this.getClass() === 'other' && !this.hasCapability('measure_temperature'))
      await this.addCapability('measure_temperature');
    
    if (this.getClass() === 'other' && !this.hasCapability('measure_humidity'))
      await this.addCapability('measure_humidity');

    if (this.getClass() === 'other' && !this.hasCapability('measure_co2'))
      await this.addCapability('measure_co2');

    this.registerMultipleCapabilityListener(['boost', 'timepicker', 'level'], this.setOptions.bind(this));
    this.log('MyDevice has been initialized');

  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    // Set default values
    this.setCapabilityValue('boost', false);
    this.setCapabilityValue('level', 100);
    this.setCapabilityValue('timepicker', this.getTime('15m'));
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
    this.homey.settings.set('ip', newSettings.ip);
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

  async setOptions(value, opts) {
    const jsondata = { enable: true };

    if ('boost' in value) jsondata.enable = value.boost;

    // Turn on boost if not on
    else if (!this.getState().boost) {
      this.setCapabilityValue('boost', true);
    }

    if ('timepicker' in value) {
      jsondata.timeout = this.getSeconds(value.timepicker);
      jsondata.default_timeout = jsondata.timeout;
    }

    if ('seconds' in value) {
      jsondata.timeout = value.seconds;
      jsondata.default_timeout = jsondata.timeout;
    }

    if ('level' in value) {
      jsondata.level = value.level;
      jsondata.default_level = jsondata.level;
    }

    // this.log('jsondata', jsondata);

    let roomdevices = [this];

    if (this.getClass() === 'fan') {
      roomdevices = this.driver.getDevices().filter(device => device.getClass() === 'other'); // Get all room devices
      if (!('timeout' in jsondata)) {
        jsondata.timeout = this.getSeconds(this.getState().timepicker);
        jsondata.default_timeout = jsondata.timeout;
      }
      if (!('level' in jsondata)) {
        jsondata.level = this.getState().level;
        jsondata.default_level = jsondata.level;
      }
    }

    await Promise.all(roomdevices.map(async device => {
      await this.axiosPut(`/boost/${device.getStoreValue('id')}`, JSON.stringify(jsondata));
      // this.log(`/boost/${device.getStoreValue('id')}`, JSON.stringify(jsondata));
    }));

  }

  async axiosPut(endpoint, json, _timeout = 10000, secondtry = false) {
    if (secondtry) this.log('Trying for a second time!', endpoint, json);
    const url = `http://${this.homey.settings.get('ip')}/v1/api${endpoint}`;
    this.log(`Posting to ${url} with json ${json} timeout ${_timeout}`);
    try {
      const resp = await axios.put(url, json, { timeout: _timeout, headers: { 'Content-Type': 'application/json' } });
      return resp.data;
    } catch (error) {
      this.error(`Put error at url ${url}`);
      if (!secondtry) {
        setTimeout(async () => {
          this.axiosPut(endpoint, json, _timeout, true);
        }, 2000);
        return false;
      }
      await this.setUnavailable('Cannot reach the device');
      setTimeout(async () => {
        await this.setAvailable();
      }, 5000);
      return false;
    }
  }

}

module.exports = MyDevice;
