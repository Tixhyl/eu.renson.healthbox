"use strict";

const Homey = require("homey");
const dgram = require("dgram");

module.exports = class MyDriver extends Homey.Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log("MyDriver has been initialized");
    await this.getHealthboxes();
  }

  /**
   * Look for Healthboxes on the network by sending a UDP broadcast and listening for replies.
   * @returns
   */
  async getHealthboxes(session) {
    this.log("Getting healthboxes");
    const client = dgram.createSocket("udp4");
    const message = Buffer.from("RENSON_DEVICE/JSON?");
    const devices = [];

    client.on("message", (msg) => {
      try {
        const jsonData = JSON.parse(msg.toString());
        this.log("Broadcast reply received:", jsonData);

        const example_data = {
          Description: "Healthbox 3.0",
          Device: "HEALTHBOX3",
          Firmwareversion: "2.6.9",
          IP: "192.168.30.37",
          MAC: "3c:e4:b0:f4:3f:e3",
          scope: "HEALTHBOX3",
          serial: "220923P0077",
          subtype: "",
          warranty_number: "XUD161250016A06",
        };

        if (jsonData.Device !== "HEALTHBOX3") return;

        const device = {
          name: `${jsonData.Description || "Healthbox"} (${jsonData.IP})`,
          data: {
            id: jsonData.warranty_number,
          },
          settings: {
            ip: jsonData.IP,
          },
        };

        devices.push(device);
        session.emit("list_devices", device);
      } catch (err) {
        this.error("Failed to parse broadcast reply:", err);
      }
    });

    await new Promise((resolve, reject) => {
      client.on("error", reject);
      client.on("listening", () => {
        client.setBroadcast(true);
        client.send(
          message,
          0,
          message.length,
          49152,
          "255.255.255.255",
          (err) => {
            if (err) reject(err);
            else this.log("Broadcast sent!");
          },
        );
      });
      client.bind();

      setTimeout(resolve, 10000);
    });

    client.close();
    this.log("Getting Healthboxes done, found:", devices.length);
    return devices;
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
};
