'use strict';

const { Device } = require('homey');
const axios = require('axios');

class MyDevice extends Device {

  getTimepickerSeconds(seconds) {
    this.log('getTimepickerSeconds', seconds);
    switch (seconds) {
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

  getTimepickerId(seconds) {
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
    // Check if generic box, if so, skip init
    if (this.getData().room_id === null) return;
    // Set current values
    const res = await this.axiosPut(`/boost/${this.getData().room_id}`, {});
    if (!res) {
      this.error('Could not initialize this device');
      return;
    }
    this.setCapabilityValue('level', res.level);
    this.setCapabilityValue('boost', res.enable);
    this.setCapabilityValue('timepicker', this.getTimepickerId(res.timeout));
    // Register listeners
    this.registerCapabilityListener('boost', async value => {
      let json;
      if (value) {
        json = JSON.stringify({ enable: true, level: this.getCapabilityValue('level'), timeout: this.getTimepickerSeconds(this.getCapabilityValue('timepicker')) });
      } else {
        json = JSON.stringify({ enable: false });
      }
      const res = await this.axiosPut(`/boost/${this.getData().room_id}`, json);
      if (res) this.log('Boost enabled for', this.getName());
    });

    this.registerCapabilityListener('timepicker', async value => {
      this.log(this.getName(), 'timepicker request', value);
      if (this.getCapabilityValue('boost')) {
        const res = await this.axiosPut(`/boost/${this.getData().room_id}`, JSON.stringify({ enable: true, timeout: this.getTimepickerSeconds(value) }));
        if (res) this.log('Time adjusted for', this.getName());
      }
    });

    this.registerCapabilityListener('level', async value => {
      this.log(this.getName(), 'level request', value);
      if (this.getCapabilityValue('boost')) {
        const res = await this.axiosPut(`/boost/${this.getData().room_id}`, JSON.stringify({ level: value }));
        if (res) this.log('Level adjusted for', this.getName());
      }
    });

    this.log('MyDevice has been initialized');
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

  async axiosPut(endpoint, json, _timeout = 10000) {
    const url = `http://${this.getData().device_ip}/v1/api${endpoint}`;
    this.log(`Posting to ${url} with json ${json} timeout ${_timeout}`);
    try {
      const resp = await axios.put(url, json, { timeout: _timeout, headers: { 'Content-Type': 'application/json' } });
      return resp.data;
    } catch (error) {
      this.error(`ERROR at url ${url}`);
      await this.setUnavailable('Cannot reach the device');
      setTimeout(async () => {
        await this.setAvailable();
      }, 5000);
      return false;
    }
  }

}

module.exports = MyDevice;
