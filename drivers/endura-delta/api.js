const fetch = require('node-fetch');
const util = require('util');
const http = require('http');

const { URLSearchParams } = require('url');

class EnduraApi {
    constructor(ip) {
        this.ip = ip;
    }
    async initializeSession() {
        try {
            const url = `http://${this.ip}/JSON/ModifiedItems?wsn=150324488709`;
            console.log(url)

            const response = await fetch(url);
            const data = await response;
            return true
        } catch (error) {
            throw error;
        }
    }

    async getData() {
        try {
            const url = `http://${this.ip}/JSON/ModifiedItems?wsn=150324488709`;
            console.log(url)

            const response = await fetch(url);
            const data = await response.json();
            return data;
        } catch (error) {
            throw error;
        }
    }

    async processData(data) {
        // Initialize basic device info
        let deviceName;
        let deviceMAC;
    
        // Initialize sensor measurements
        let CO2;
        let indoorAirQuality;
        let currentVentilationLevel;
        let externalTemperature;
        let internalTemperature;
        let humidity;
        let measuredSupAirflow;
        let measuredEtaAirflow;
        let totalNominalAirflow;
        
        // Initialize maintenance info
        let filterRemainingDays;
    
        // Initialize system states
        let bypassLevel;
        let frostProtectionActive;
        let preheaterEnabled;
        let breezeConditionsMet;
    
        try {
            for (let index = 0; index < data["ModifiedItems"].length; index++) {
                const item = data["ModifiedItems"][index];
                
                switch (item["Name"]) {
                    // Basic device info
                    case "Warranty number":
                        deviceName = item["Value"];
                        break;
                    case "MAC":
                        deviceMAC = item["Value"];
                        break;
    
                    // Sensor measurements
                    case "CO2":
                        CO2 = parseInt(item["Value"]);
                        break;
                    case "IAQ":
                        indoorAirQuality = parseInt(item["Value"]);
                        break;
                    case "Current ventilation level":
                        currentVentilationLevel = item["Value"];
                        console.log(currentVentilationLevel);
                        break;
                    case "T21":
                        externalTemperature = parseInt(item["Value"]);
                        break;
                    case "T11":
                        internalTemperature = parseInt(item["Value"]);
                        break;
                    case "RH11":
                        humidity = parseInt(item["Value"]);
                        break;
                    case "Measured SUP airflow":
                        measuredSupAirflow = item["Value"];
                        break;
                    case "Measured ETA airflow":
                        measuredEtaAirflow = item["Value"];
                        break;
                    case "Total nominal airflow":
                        totalNominalAirflow = item["Value"];
                        break;
    
                    // Maintenance info
                    case "Filter remaining time":
                        filterRemainingDays = parseInt(item["Value"]);
                        break;
    
                    // System states
                    case "Bypass level":
                        bypassLevel = item["Value"];
                        break;
                    case "Frost protection active":
                        frostProtectionActive = item["Value"];
                        break;
                    case "Preheater enabled":
                        preheaterEnabled = item["Value"];
                        break;
                    case "Breeze conditions met":
                        breezeConditionsMet = item["Value"];
                        break;
                }
            }
    
            return {
                // Basic device info
                deviceName,
                deviceMAC,
                
                // Sensor measurements
                CO2,
                indoorAirQuality,
                currentVentilationLevel,
                externalTemperature,
                internalTemperature,
                humidity,
                measuredSupAirflow,
                measuredEtaAirflow,
                totalNominalAirflow,
                
                // Maintenance info
                filterRemainingDays,
                
                // System states
                bypassLevel,
                frostProtectionActive,
                preheaterEnabled,
                breezeConditionsMet
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Helper method for making HTTP POST requests to the Endura Delta
     * @param {string} endpoint - API endpoint path
     * @param {object} body - Request body to send
     * @returns {Promise} - Resolves with response data or true
     */
    async makePostRequest(endpoint, body) {
        return new Promise((resolve, reject) => {
            const bodyStr = JSON.stringify(body);
            
            // Configure request options with required headers
            const options = {
                hostname: this.ip,
                port: 80,
                path: endpoint,
                method: 'POST',
                headers: {
                    'Host': this.ip,
                    'Content-Type': 'application/json',
                    'Connection': 'keep-alive',
                    'Accept': '*/*',
                    'User-Agent': 'Endura Delta/1.8.3 (iPhone; iOS 18.3; Scale/3.00)',
                    'Accept-Language': 'cs-CZ;q=1, en-GB;q=0.9',
                    'Content-Length': Buffer.byteLength(bodyStr),
                    'Accept-Encoding': 'gzip, deflate'
                }
            };

            const req = http.request(options, (res) => {
                let data = '';

                // Collect data chunks
                res.on('data', (chunk) => {
                    data += chunk;
                });

                // Process complete response
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(data ? JSON.parse(data) : true);
                        } catch (e) {
                            resolve(true);
                        }
                    } else {
                        reject(new Error(`HTTP Error ${res.statusCode}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.write(bodyStr);
            req.end();
        });
    }

    async setVentilationTimer(minutes, level) {
        try {
            // Validate input parameters
            if (minutes < 0 || minutes > 180) {
                throw new Error('Minutes must be between 0 and 180');
            }
            if (level < 1 || level > 4) {
                throw new Error('Level must be between 1 and 4');
            }

            const endpoint = '/JSON/Vars/Ventilation%20timer?index0=0&index1=0&index2=0';
            const body = { Value: `${minutes} min Level${level}` };
            
            return await this.makePostRequest(endpoint, body);
        } catch (error) {
            throw error;
        }
    }

    async stopVentilationTimer() {
        try {
            // Reset ventilation timer to default state
            const endpoint = '/JSON/Vars/Ventilation%20timer?index0=0&index1=0&index2=0';
            const body = { Value: "0 min Level1" };
            
            return await this.makePostRequest(endpoint, body);
        } catch (error) {
            throw error;
        }
    }

    async startBreezeMode(minutes) {
        try {
            // Validate duration
            if (minutes < 0 || minutes > 180) {
                throw new Error('Minutes must be between 0 and 180');
            }

            const endpoint = '/JSON/Vars/Ventilation%20timer?index0=0&index1=0&index2=0';
            const body = { Value: `${minutes} min breeze` };
            
            return await this.makePostRequest(endpoint, body);
        } catch (error) {
            throw error;
        }
    }

    async setHolidayMode(targetDate) {
        try {
            const now = new Date();
            const target = new Date(targetDate);
            
            // Validate target date
            if (target <= now) {
                throw new Error(`Target date must be in the future. Target: ${target.toISOString()}, Now: ${now.toISOString()}`);
            }
            
            // Calculate difference in minutes
            const diffMs = target.getTime() - now.getTime();
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            
            if (diffMinutes <= 0) {
                throw new Error(`Invalid time difference: ${diffMinutes} minutes`);
            }
            
            if (diffMinutes > 525600) { // 365 days * 24 hours * 60 minutes
                throw new Error('Holiday mode cannot be set for more than one year');
            }
    
            const endpoint = '/JSON/Vars/Ventilation%20timer?index0=0&index1=0&index2=0';
            const body = { Value: `${diffMinutes} min holiday` };
            
            const response = await this.makePostRequest(endpoint, body);
            
            return response;
        } catch (error) {
            console.error('Error in setHolidayMode:', error);
            throw error;
        }
    }

    async setAutomaticBreeze(enabled, temperature, level) {
        try {
            // Input validation
            if (level < 1 || level > 4) {
                throw new Error('Level must be between 1 and 4');
            }
            if (temperature < 15 || temperature > 35) {
                throw new Error('Temperature must be between 15°C and 35°C');
            }
    
            // Execute all three API calls in sequence
            await this.setBreezeEnable(enabled);
            await this.setBreezeTemperature(temperature);
            await this.setBreezeLevel(level);
    
            return true;
        } catch (error) {
            throw new Error(`Failed to set automatic breeze: ${error.message}`);
        }
    }
    
    async setBreezeEnable(enabled) {
        try {
            const endpoint = '/JSON/Vars/Breeze%20enable?index0=0&index1=0&index2=0';
            const body = { Value: enabled ? "1" : "0" };
            
            return await this.makePostRequest(endpoint, body);
        } catch (error) {
            throw error;
        }
    }
    
    async setBreezeLevel(level) {
        try {
            const endpoint = '/JSON/Vars/Breeze%20level?index0=0&index1=0&index2=0';
            const body = { Value: `Level${level}` };
            
            return await this.makePostRequest(endpoint, body);
        } catch (error) {
            throw error;
        }
    }
    
    async setBreezeTemperature(temperature) {
        try {
            const endpoint = '/JSON/Vars/Breeze%20activation%20temperature?index0=0&index1=0&index2=0';
            const body = { Value: temperature.toString() };
            
            return await this.makePostRequest(endpoint, body);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = { EnduraApi };
