'use strict';

const { Driver } = require('homey');
const dgram = require('dgram');
const axios = require('axios');

class MyDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('MyDriver has been initialized');
  }

  async getHealthboxes(session) {
    this.log('Getting healthboxes');
    const client = dgram.createSocket('udp4');
    const message = Buffer.from('RENSON_DEVICE/JSON?');
    const devices = [];

    client.on('message', msg => {
      const jsonData = JSON.parse(msg.toString());
      this.log('message received', jsonData);
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
      const device2 = {
        name: 'Fake Renson (192.111.111.111)',
        data: {
          id: 'qmoiezjfqmiejfqzef',
        },
        settings: {
          ip: '192.111.111.111',
        },
      };
      devices.push(device);
      devices.push(device2);
      session.emit('list_devices', device);
      session.emit('list_devices', device2);
    });

    client.on('listening', () => client.setBroadcast(true));
    client.bind();

    client.send(message, 0, message.length, 49152, '255.255.255.255', err => {
      if (err) this.error('Error!', err);
      else this.log('Message sent!');
    });
    await new Promise(r => setTimeout(r, 2000));
    return devices;
  }

  async getRooms(session) {
    const roomDevices = [];
    this.log('Getting rooms, ip: ', this.selectedDevice.settings.ip);
    this.log('Getting rooms, id: ', this.selectedDevice.data.id);
    const res = await this.axiosFetch(this.selectedDevice.settings.ip, '/data/current');
    if (res) {
      if (res.room && res.room.length) {
        await Promise.all(res.room.map(async element => {
          const room = await this.axiosFetch(this.selectedDevice.settings.ip, `/boost/${element.id}`);
          this.log(element.id, element.name, element.actuator[0].parameter.flow_rate.value, 'm³/h', 'boost enabled', room.enable, 'boost value', room.level, 'remaining', room.remaining);
          const dev = {
            name: element.name,
            data: {
              id: `${this.selectedDevice.data.id}-${element.id}`,
              room_id: element.id,
            },
          };
          session.emit('list_devices', dev);
          roomDevices.push(dev);
        }));
      }
    } else {
      this.log('Failed!');
    }

    this.log('roomdevices', roomDevices);

    this.selectedDevice = null;

    return roomDevices;
  }

  async onPair(session) {
    this.selectedDevice = null;

    session.setHandler('list_devices', async () => {
      if (!this.selectedDevice) {
        this.log('1ST VIEW');
        return this.getHealthboxes(session);
      }
      this.log('2ND VIEW');
      return this.getRooms(session);
    });

    // settings frozen already here
    session.setHandler('list_healthboxes_selection', async data => {
      this.log('handler: list_healthboxes_selection', data);
      this.selectedDevice = data[0];
    });
    /* session.setHandler('list_rooms_selection', async data => {
      this.log('handler: list_rooms_selection', data);
    }); */
  }

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  /* async onPairListDevices() {
    this.log('onPairListDevices');

    return [{
      name: 'Gerard',
      data: {
        id: 'ranty_number',
      },
    }];

    

    // Create a udp socket client object.
    const client = dgram.createSocket('udp4');
    // message variable is used to save user input text.
    const message = Buffer.from('RENSON_DEVICE/JSON?');
    // Send message to udp server through client socket.
    const devices = [];
    const returnDevices = [];

    client.on('message', msg => {
      this.log('got message type', typeof msg);
      const jsonData = JSON.parse(msg.toString());
      this.log('message received', jsonData);
      if (jsonData.Device !== 'HEALTHBOX3') return; // Check if device is actually a HEALTHBOX3
      const device = {
        name: (jsonData.Description === '' ? 'Healthbox' : jsonData.Description),
        data: {
          id: jsonData.warranty_number,
        },
        settings: {
          ip: jsonData.IP,
        },
      };
      returnDevices.push(device);
    });

    this.log('Array of objects', devices);

    client.on('listening', () => client.setBroadcast(true));
    client.bind();

    client.send(message, 0, message.length, 49152, '255.255.255.255', err => {
      if (err) {
        this.log('Error!', err);
      } else {
        this.log('Message sent!');
      }
    });

    // Give the Healthbox some time to answer
    await new Promise(r => setTimeout(r, 1000));

    const roomDevices = [];

    if (returnDevices.length === 1) {
      // Only 1 Healthbox found, so listing the devices of this
      // http://192.168.10.41/v1/api/data/current
      const res = await this.axiosFetch('192.168.10.41', '/data/current');
      if (res) {
        this.log('fetched', res.room.length);

        if (res.room && res.room.length) {
          await Promise.all(res.room.map(async element => {
            const room = await this.axiosFetch('192.168.10.41', `/boost/${element.id}`);
            this.log(element.id, element.name, element.actuator[0].parameter.flow_rate.value, 'm³/h', 'boost enabled', room.enable, 'boost value', room.level, 'remaining', room.remaining);
            roomDevices.push({
              name: element.name,
              data: {
                id: `${returnDevices[0].data.id}-${element.id}`,
                room_id: element.id,
              },
            });
          }));
        }
      } else {
        this.log('Failed!');
      }
    }

    this.log('roomdevices', roomDevices);

    return roomDevices;
  } */

  /*
    Make an API call
  */
  async call(endpoint) {
    return null;
  }

  async axiosFetch(ip, endpoint, _timeout = 3000) {
    const url = `http://${ip}/v1/api${endpoint}`;
    this.log(`Requesting ${url} with timeout ${_timeout}`);
    try {
      const resp = await axios.get(url, { timeout: _timeout });
      // this.setAvailable().catch(this.error);
      return resp.data;
    } catch (error) {
      // let errcode;
      // if (error.response === undefined) errcode = 1; // Timeout
      // if (error.response !== undefined && error.response.data.status === 404) errcode = 2; // 404 - Not Found
      // const errMess = { error: true, error_code: errcode };
      this.log(`Error at endpoint ${endpoint}`, error);
      return null;
    }
  }

}

module.exports = MyDriver;
