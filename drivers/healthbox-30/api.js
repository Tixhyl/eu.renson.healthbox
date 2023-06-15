const fetch = require('node-fetch');
// const util = require('util');
// const { URLSearchParams } = require('url');

class HealthboxApi {

    constructor(ip) {
        this.ip = ip;
    }

    async #getPrivilegedAccessState() {
        try {
            const response = await fetch(`http://${this.ip}/v2/api/api_key/status`);
            const data = await response.json();
            return data
        } catch (error) {
            throw error;
        }
    }

    async setAccessKey(key) {
        try {
            const response = await fetch(`http://${this.ip}/v2/api/api_key`, {
                method: 'post',
                body: JSON.stringify(key),
                headers: {'Content-Type': 'application/json'}
            });
            const status_code = await response.status
            return (status_code == 200)
        } catch (error) {
            throw error;
        }
    }

    async verifyAccessKey(key, uploaded = false) {
        try {
            const state = await this.#getPrivilegedAccessState()
            if (state.state == "valid") {
                // all fine
                console.log("Valid!")
                return {'valid': true, 'msg': 'Valid'}
            } else if (state.state == "validating") {
                // still busy, try again later
                console.log("Validating...")
                await new Promise(r => setTimeout(r, 2000));
                return await this.verifyAccessKey(key, uploaded)
            } else {
                console.log("Invalid, setting key now")
                // invalid or no key assigned
                const keyupload = await this.setAccessKey(key)
                if (keyupload && !uploaded) {
                    console.log("Keyupload successful, checking if valid key...", uploaded)
                    return await this.verifyAccessKey(key, true)
                } else if (keyupload && uploaded) {
                    console.log("Keyupload successful but invalid key has been entered")
                    return {'valid': false, 'msg': 'Invalid Key'}
                } else {
                    console.log("Keyupload failed")
                    return {'valid': false, 'msg': 'Failed to set Key'}
                }
            }
        } catch (error) {
            console.log("Error while checking key", error)
        }
    }

}

module.exports = { HealthboxApi };
