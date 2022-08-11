'use strict';

const { Driver } = require('homey');
const dgram = require('dgram');
const axios = require('axios');
const { randomBytes } = require('crypto');

class MyDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.setFlows();
    this.interval = 10000;
    this.updateLoop();
    this.loopErrors = 0;
    this.log('Driver initialized');
  }

  async updateLoop() {
    if (!this.homey.settings.get('ip')) {
      setTimeout(this.updateLoop.bind(this), this.interval);
      return;
    }

    try {
      const req = await this.axiosFetch(this.homey.settings.get('ip'), '/api/data/current');
      if (!req) throw new Error('Request failed ');

      let _aqi = 0;
      if (req.sensor !== undefined && req.sensor.length > 0 && req.sensor[0] !== undefined
        && req.sensor[0].parameter !== undefined && req.sensor[0].parameter.index !== undefined
        && req.sensor[0].parameter.index.value !== undefined) {
        _aqi = req.sensor[0].parameter.index.value;
      }

      const rooms = req.room;
      await Promise.all(this.getDevices().map(async element => {
        if (element.getClass() === 'fan') {
          // Generic Box Ventilation statics
          const req = await this.axiosFetch(element.getStoreValue('address'), '/device/fan');
          if (!req) throw new Error('Cannot get /device/fan');
          element.setCapabilityValue('measure_rpm', req.rpm);
          element.setCapabilityValue('measure_flowrate', Math.round(req.flow * 1e1) / 1e1);
          element.setCapabilityValue('measure_power', Math.round(req.power * 1e1) / 1e1);
          if (element.hasCapability('measure_airqualityindex')) {
            element.setCapabilityValue('measure_airqualityindex', Math.round(_aqi));
          }
        } else {
          // Room Ventilation statics
          const roomInfo = await this.axiosFetch(element.getStoreValue('address'), `/api/boost/${element.getStoreValue('id')}`);
          if (!roomInfo) throw new Error('No roominfo found');

          const matchedRoom = rooms.find(item => item.id === element.getStoreValue('id'));
          element.setCapabilityValue('measure_flowrate', Math.round(matchedRoom.actuator[0].parameter.flow_rate.value * 1e1) / 1e1);
          element.setCapabilityValue('boost', roomInfo.enable);
          element.setCapabilityValue('level', roomInfo.level);
          element.setCapabilityValue('timeleft', new Date(roomInfo.remaining * 1000).toISOString().substr(11, 8));
        }
        if (!element.getAvailable()) await element.setAvailable();
      }));
      this.loopErrors = 0;
    } catch (err) {
      if (this.loopErrors < 3) {
        this.loopErrors++;
      } else if (this.loopErrors === 3) {
        // 5 errors in a row -> disable devices
        this.log('Disableing all devices');
        await Promise.all(this.getDevices().map(async element => element.setUnavailable('Cannot reach this device')));
      }
      this.log('Error', this.loopErrors, 'in updateLoop!');
      this.error('Main updateLoop error', err);
    } finally {
      setTimeout(this.updateLoop.bind(this), this.interval);
    }
  }

  async getHealthboxes(session) {
    this.log('Getting healthboxes');
    const client = dgram.createSocket('udp4');
    const message = Buffer.from('RENSON_DEVICE/JSON?');
    const devices = [];

    client.on('message', msg => {
      const jsonData = JSON.parse(msg.toString());
      this.log('Broadcast reply message received!');
      if (jsonData.Device !== 'HEALTHBOX3') return; // Check if device is actually a HEALTHBOX3
      const device = {
        name: `${jsonData.Description === '' ? 'Healthbox' : jsonData.Description} (${jsonData.IP})`,
        data: {
          id: jsonData.warranty_number,
        },
        settings: {
          ip: jsonData.IP,
        },
      };
      devices.push(device);
      session.emit('list_devices', device);
    });

    client.on('listening', () => client.setBroadcast(true));
    client.bind();

    client.send(message, 0, message.length, 49152, '255.255.255.255', err => {
      if (err) this.error('Error!', err);
      else this.log('Message sent!');
    });
    await new Promise(r => setTimeout(r, 2000));
    this.log('Getting Healthboxes done!');
    return devices;
  }

  async getRooms(session) {
    const roomDevices = [];
    const res = await this.axiosFetch(this.selectedDevice.settings.ip, '/api/data/current');
    if (!res) return [];
    if (res.room && res.room.length) {
      await Promise.all(res.room.map(async element => {
        const room = await this.axiosFetch(this.selectedDevice.settings.ip, `/api/boost/${element.id}`);
        if (!room) return;
        this.log(element.id, element.name, element.actuator[0].parameter.flow_rate.value, 'm³/h', 'boost enabled', room.enable, 'boost value', room.level, 'remaining', room.remaining);
        const dev = {
          name: element.name,
          class: 'other',
          data: { id: `${this.selectedDevice.data.id}#${element.id}` },
          store: {
            address: this.selectedDevice.settings.ip,
            id: element.id,
          },
          icon: '/room.svg',
        };
        session.emit('list_devices', dev);
        roomDevices.push(dev);
      }));
    }
    try {
      // Ventilation Device
      const dev = {
        name: res.global.parameter['device name'].value,
        class: 'fan',
        data: { id: `${this.selectedDevice.data.id}#box` },
        store: {
          address: this.selectedDevice.settings.ip,
          id: -1,
        },
        capabilities: ['measure_rpm', 'measure_power', 'measure_flowrate', 'boost', 'level', 'timepicker', 'measure_airqualityindex'],
      };
      session.emit('list_devices', dev);
      roomDevices.push(dev);
    } catch (error) {
      this.error('Could not add generic Box device');
    }

    this.log('Found', roomDevices.length, 'devices!');
    this.selectedDevice = null;
    return roomDevices;
  }

  async onPair(session) {
    this.selectedDevice = null;

    session.setHandler('list_devices', async () => {
      if (!this.selectedDevice) {
        return this.getHealthboxes(session);
      }
      return this.getRooms(session);
    });

    session.setHandler('list_healthboxes_selection', async data => {
      this.selectedDevice = data[0];
      this.homey.settings.set('ip', this.selectedDevice.settings.ip);
    });
  }

  async setFlows() {
    const setFlowrateAction = this.homey.flow.getActionCard('set-flowrate');
    setFlowrateAction.registerArgumentAutocompleteListener(
      'rooms',
      async (query, args) => {
        const results = [];
        results.push({ name: this.homey.__('rooms'), allrooms: true });
        this.getDevices().map(async device => {
          this.log('Getting devices,');
          results.push({ name: device.getName(), allrooms: false, data: device.getData() });
        });
        return results.filter(result => {
          return result.name.toLowerCase().includes(query.toLowerCase());
        });
      },
    );

    const flowActionFlowrate = this.homey.flow.getActionCard('set-flowrate');
    flowActionFlowrate.registerRunListener(async (args, state) => {
      const level = args.flowrate;
      const seconds = args.activationtime;
      if (args.rooms.allrooms) {
        await Promise.all(this.getDevices().map(async device => {
          if (device.getClass() !== 'fan') device.setOptions({ boost: true, level, seconds });
        }));
      } else {
        await this.getDevice(args.rooms.data).setOptions({ boost: true, level, seconds });
      }
    });

    const stopBoostCard = this.homey.flow.getActionCard('stop-boost');
    stopBoostCard.registerArgumentAutocompleteListener(
      'rooms',
      async (query, args) => {
        const results = [];
        results.push({ name: this.homey.__('rooms'), allrooms: true });
        this.getDevices().map(async device => {
          results.push({ name: device.getName(), allrooms: false, data: device.getData() });
        });
        return results.filter(result => {
          return result.name.toLowerCase().includes(query.toLowerCase());
        });
      },
    );
    const stopBoostCardFlow = this.homey.flow.getActionCard('stop-boost');
    stopBoostCardFlow.registerRunListener(async (args, state) => {
      if (args.rooms.allrooms) {
        await Promise.all(this.getDevices().map(async device => {
          if (device.getClass() !== 'fan') device.setOptions({ boost: false });
        }));
      } else {
        await this.getDevice(args.rooms.data).setOptions({ boost: false });
      }
    });
  }

  async axiosFetch(ip, endpoint, _timeout = 10000) {
    const url = `http://${ip}/v1${endpoint}`;
    try {
      const resp = await axios.get(url, { timeout: _timeout });
      return resp.data;
    } catch (error) {
      this.log(`Fetch error at url ${url}`);
      return false;
    }
  }

}

module.exports = MyDriver;
