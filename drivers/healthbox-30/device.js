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
    // Check if generic box, if so, skip init
    // if (this.getData().room_id === null) return;
    // Set current values
    /* const res = await this.axiosPut(`/boost/${this.getData().room_id}`, {});
    if (!res) {
      this.error('Could not initialize this device');
      return;
    }
    this.setCapabilityValue('level', res.level);
    this.setCapabilityValue('boost', res.enable);
    this.setCapabilityValue('timepicker', this.getTimepickerId(res.timeout)); */
    // Register listeners

    /* this.registerCapabilityListener('boost', async value => {
      const res = await this.setAllValuesRequest(-1, value, this.getCapabilityValue('level'), this.getTimepickerSeconds(this.getCapabilityValue('timepicker')));
      if (res) this.log('Boost enabled for', this.getName());
    }); */

    /* this.registerCapabilityListener('boost', this.setOptions.bind(this));
    this.registerCapabilityListener('timepicker', this.setOptions.bind(this));
    this.registerCapabilityListener('level', this.setOptions.bind(this)); */

    if (this.getClass() === 'fan' && this.hasCapability('measure_airqualityindex') === false) {
      this.log('Adding new capability');
      await this.addCapability('measure_airqualityindex');
    }

    this.registerMultipleCapabilityListener(['boost', 'timepicker', 'level'], this.setOptions.bind(this));

    /* this.registerCapabilityListener('timepicker', async value => {
      this.log(this.getName(), 'timepicker request', value);
      // if (this.getCapabilityValue('boost')) {
      const res = await this.axiosPut(`/boost/${this.getData().room_id}`, JSON.stringify({ enable: true, default_timeout: this.getTimepickerSeconds(value) }));
      if (res) this.log('Time adjusted for', this.getName());
      // }
    });

    this.registerCapabilityListener('level', async value => {
      this.log(this.getName(), 'level request', value);
      const res = await this.axiosPut(`/boost/${this.getData().room_id}`, JSON.stringify({ default_level: value, level: value }));
      if (res) this.log('Level adjusted for', this.getName());
    }); */

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

    /* const device = this.getStoreValue('device');
    const id = this.getStoreValue('id');
    const state = this.getState();
    this.log('Boost:', enable, 'level', level, 'time', timeout, 'device', device, 'id', id);
    // Json creation
    const jsondata = { enable };
    // if (enable !== state.boost) jsondata.enable = enable;
    // else jsondata.enable = state.boost;
    if (level !== state.level) jsondata.level = level;
    if (timeout !== this.getSeconds(state.timepicker)) jsondata.timeout = this.getSeconds(timeout);

    if (device === 'main') {
      await Promise.all(this.driver.getDevices().map(async element => {
        if (element.getStoreValue('device') !== 'room') return; // Skip if it's not a room (but a ventilation box)
        await this.axiosPut(`/boost/${element.getStoreValue('id')}`, JSON.stringify(jsondata));
      }));
    }
    if (device === 'room') {
      const res = await this.axiosPut(`/boost/${id}`, JSON.stringify(jsondata));
      return res;
    }
    return true; */
  }

  async axiosPut(endpoint, json, _timeout = 10000, secondtry = false) {
    if (secondtry) this.log('Trying for a second time!', endpoint, json);
    const url = `http://${this.getStoreValue('address')}/v1/api${endpoint}`;
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
