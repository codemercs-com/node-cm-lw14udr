// Copyright Code Mercenaries GmbH, www.codemercs.com
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const { formatWithOptions } = require('util');

module.exports = function (RED) {
    'use strict';
    const fs = require('fs');

    const MODE_DEBUG = 1;   //0 -> no debug reports, 1 show reports in log

    //Some defines
    const DALI_MODE_DACP = 0x00;
    const DALI_MODE_CMD = 0x01;
    const DALI_ADR_GROUP = 0x80;
    const DALI_ADR_SHORT = 0x00;

    //Some settings for LW14
    const LW14_I2C = 0x40;          //8Bit address
    const LW14_REG_STATUS = 0x00;   //Status register
    const LW14_REG_CMD = 0x01;      //Command register

    //Answers of 'status' register
    const LW14_STATE_NONE = 0x00;
    const LW14_STATE_1BYTE = 0x01;
    const LW14_STATE_2BYTE = 0x02;
    const LW14_STATE_TIMEFRAME = 0x04;
    const LW14_STATE_VALID = 0x08;
    const LW14_STATE_FRAMEERROR = 0x10;
    const LW14_STATE_OVERRUN = 0x20;
    const LW14_STATE_BUSY = 0x40;
    const LW14_STATE_BUS_FAULT = 0x80;

    const SUCCESS = 0x0000;
    const ERROR = 0x0001;

    //const DEVICE_VID = 0x07c0;		// Code Mercenaries Vendor ID
    //const DEVICE_PID = 0x1501;		// IOW24 Product ID, part of LW14UDR
    const DEVICE_PATH = "/dev/usb/iowarrior1";
    const REPORT_SIZE = 8;

    //Debug function to print report
    function PrintReport(prefix, Buffer) {
        if (MODE_DEBUG == 1) {
            console.log(prefix + "Report: " + Buffer[0].toString(16) +
                " " + Buffer[1].toString(16) +
                " " + Buffer[2].toString(16) +
                " " + Buffer[3].toString(16) +
                " " + Buffer[4].toString(16) +
                " " + Buffer[5].toString(16) +
                " " + Buffer[6].toString(16) +
                " " + Buffer[7].toString(16) +
                " ");
        }
    }

    function InitReport(fd) {
        var bytesWritten = 0;
        var buffer = Buffer.from([0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
        bytesWritten = fs.writeSync(fd, buffer, 0, REPORT_SIZE, 0);

        if (bytesWritten == REPORT_SIZE)
            return true;
        else {
            console.log("report buffer not correct: " + bytesWritten + " instead of " + REPORT_SIZE);
            return false;
        }
    }

    function WriteReport(fd, buffer) {
        var bytesWritten = 0;
        var bytesRead = 0;
        var rBuffer = Buffer.alloc(REPORT_SIZE);

        bytesWritten = fs.writeSync(fd, buffer, 0, REPORT_SIZE, 0);
        if (bytesWritten == REPORT_SIZE) {
            bytesRead = fs.readSync(fd, rBuffer, 0, REPORT_SIZE, 0);
            if (bytesRead == REPORT_SIZE) {
                if ((rBuffer[1] & 0x80) == 0x80) //Error flag detected
                {
                    console.log("error flag detected, I2C address of LW14UDR not default 0x40");
                    return false;
                }
                else
                    return true;
            }
            else {
                console.log("report buffer not correct: " + bytesRead + " instead of " + REPORT_SIZE);
                return false;
            }
        }
        else {
            console.log("report buffer not correct: " + bytesWritten + " instead of " + REPORT_SIZE);
            return false;
        }
    }

    function SetReadRegister(fd, reg) {
        var bytesWritten = 0;
        var bytesRead = 0;
        var wBuffer = Buffer.from([0x02, 0xC2, 0x40, parseInt(reg), 0x00, 0x00, 0x00, 0x00]);
        var rBuffer = Buffer.alloc(8);

        bytesWritten = fs.writeSync(fd, wBuffer, 0, REPORT_SIZE, 0);
        if (bytesWritten == REPORT_SIZE) {
            bytesRead = fs.readSync(fd, rBuffer, 0, REPORT_SIZE, 0);
            if (bytesRead == REPORT_SIZE) {
                if ((rBuffer[1] & 0x80) == 0x80) //Error flag detected
                {
                    console.log("error flag detected, I2C address of LW14UDR not default 0x40");
                    return false;
                }
                else
                    return true;
            }
            else {
                console.log("report buffer not correct: " + bytesRead + " instead of " + REPORT_SIZE);
                return false;
            }
        }
        else {
            console.log("report buffer not correct: " + bytesWritten + " instead of " + REPORT_SIZE);
            return false;
        }
    }

    function ReadReport(fd, buffer) {
        var bytesWritten = 0;
        var bytesRead = 0;
        var rBuffer = Buffer.alloc(REPORT_SIZE);

        bytesWritten = fs.writeSync(fd, buffer, 0, REPORT_SIZE, 0);
        if (bytesWritten == REPORT_SIZE) {
            bytesRead = fs.readSync(fd, rBuffer, 0, REPORT_SIZE, 0);
            if (bytesRead == REPORT_SIZE) {
                if ((rBuffer[1] & 0x80) == 0x80) //Error flag detected
                {
                    console.log("error flag detected, I2C address of LW14UDR not default 0x40");
                    return 0x00;
                }
                else
                    return rBuffer[2];
            }
            else {
                console.log("report buffer not correct: " + bytesRead + " instead of " + REPORT_SIZE);
                return 0x00;
            }
        }
        else {
            console.log("report buffer not correct: " + bytesWritten + " instead of " + REPORT_SIZE);
            return 0x00;
        }
    }

    function GetStatus(fd) {
        var result = 0x00;
        var buffer = Buffer.from([0x03, 1, (LW14_I2C | 0x01), LW14_REG_STATUS, 0x00, 0x00, 0x00, 0x00]);

        result = ReadReport(fd, buffer);
        return result;
    }

    function WaitForReady(fd) {
        var error = false;
        var result = 0x00;
        var i = 0;

        for (i = 0; i < 500; i++)
        {
            result = GetStatus(fd);
            //console.log("WaitForReady: " + result.toString(16));

            if ((result & LW14_STATE_BUS_FAULT) == LW14_STATE_BUS_FAULT) {
                error = true;
                break;
            }

            if ((result & LW14_STATE_BUSY) != LW14_STATE_BUSY) {
                error = true;
                break;
            }
        }

        return error;
    }

    function WaitForReply(fd) {
        var error = ERROR;
        var result = 0x00;

        for (var i = 0; i < 500; i++)
        {
            result = GetStatus(fd);
            if (result == LW14_STATE_NONE) {
                //node.error("No resonse from the device");
                error = ERROR;
                break;
            }

            if ((result & LW14_STATE_BUS_FAULT) == LW14_STATE_BUS_FAULT) {
                //node.error("Bus fault detected");
                error = ERROR;
                break;
            }

            if ((result & (LW14_STATE_VALID | LW14_STATE_1BYTE)) == (LW14_STATE_VALID | LW14_STATE_1BYTE)) {
                error = SUCCESS;
                break;
            }
        }

        return error;
    }

    //Send direct output (0...254)
    function lw14udr_dacp(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.dali_type = n.dali_type;
        this.dali_adr = n.dali_adr;         //device num 0...63
        this.dali_value = n.dali_value;     //value of DALI (0...255, 255 -> MASK)

        var node = this;
        var dali_adr = 0x00;                //BYTE, unsigned char
        var dali_value = node.dali_value;   //BYTE, unsigned char
        var dali_type = node.dali_type;

        node.on("input", function (msg) {

            if (isNaN(dali_value)) {
                this.status({fill:"red", shape:"ring", text:"Value ("+dali_value+") value is missing or incorrect"});
                return;
            }

            if (isNaN(dali_adr)) {
                this.status({fill:"red", shape:"ring", text:"Device adr. ("+dali_adr+") value is missing or incorrect"});
                return;
            }

            //Get valid DALI address
            if (dali_type == 0) dali_adr = DALI_ADR_GROUP | 0xFE | DALI_MODE_DACP;                              //Broadcast
            if (dali_type == 1) dali_adr = DALI_ADR_GROUP | ((node.dali_adr << 1) & 0xFE) | DALI_MODE_DACP;     //Group
            if (dali_type == 2) dali_adr = DALI_ADR_SHORT | ((node.dali_adr << 1) & 0xFE) | DALI_MODE_DACP;     //Short

            var wBuffer = Buffer.alloc(REPORT_SIZE); //reportID, Data, Data, ....

            try {
                var fd = fs.openSync(DEVICE_PATH, 'w+');
                if (fd != null) {
                    node.status({ fill: "grey", shape: "dot", text: "Pending" });
                    var success = InitReport(fd);  //Init I2C mode from IO-Warrior

                    if (success == true) {
                        wBuffer = Buffer.from([0x02, 0xC4, LW14_I2C, LW14_REG_CMD, parseInt(dali_adr), parseInt(dali_value), 0x00, 0x00]);
                        success = WriteReport(fd, wBuffer);

                        if (success == true)
                            node.status({ fill: "green", shape: "dot", text: "Success" });
                        else {
                            node.status({ fill: "red", shape: "dot", text: "Error" });
                            node.error("Error during write on LW14UDR");
                        }

                        //Disable I2C-Mode?
                        //iBuffer = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
                        //bytesWritten = fs.writeSync(fd, iBuffer, 0, REPORT_SIZE, 0);
                        //if(bytesWritten != REPORT_SIZE)
                        //    console.log("report buffer not correct: " + bytesWritten + " instead of " + REPORT_SIZE);
                    }

                    fs.closeSync(fd);
                }
                else
                    node.error("Can not open path '/dev/usb/iowarrior1'. Check your USB connection or permissions (0666) needed");
            }
            catch (error) {
                console.log(error.name + " : " + error.message);
            }
        });

        node.on('close', function () {
            node.device.close();
        });
    }
    RED.nodes.registerType("dacp", lw14udr_dacp);


    function lw14udr_command(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.dali_type = n.dali_type;
        this.dali_adr = n.dali_adr;         //device num 0...63
        this.dali_value = n.dali_value;     //value of DALI (0...255, 255 -> MASK)

        var node = this;
        var dali_adr = 0x00;                //BYTE, unsigned char
        var dali_value = node.dali_value;   //BYTE, unsigned char
        var dali_type = node.dali_type;

        node.on("input", function (msg) {
            //Get valid DALI address
            if (dali_type == 0) dali_adr = DALI_ADR_GROUP | 0xFE | DALI_MODE_CMD;                              //Broadcast
            if (dali_type == 1) dali_adr = DALI_ADR_GROUP | ((node.dali_adr << 1) & 0xFE) | DALI_MODE_CMD;     //Group
            if (dali_type == 2) dali_adr = DALI_ADR_SHORT | ((node.dali_adr << 1) & 0xFE) | DALI_MODE_CMD;     //Short

            //Buffers for write/read
            var wBuffer = Buffer.alloc(REPORT_SIZE);

            try {
                var fd = fs.openSync(DEVICE_PATH, 'w+');
                if (fd != null) {
                    node.status({ fill: "grey", shape: "dot", text: "Pending" });
                    var success = InitReport(fd);  //Init I2C mode from IO-Warrior

                    if (success == true) {
                        wBuffer = Buffer.from([0x02, 0xC4, LW14_I2C, LW14_REG_CMD, parseInt(dali_adr), parseInt(dali_value), 0x00, 0x00]);
                        success = WriteReport(fd, wBuffer);

                        if (success == true)
                            node.status({ fill: "green", shape: "dot", text: "Success" });
                        else {
                            node.status({ fill: "red", shape: "dot", text: "Error" });
                            node.error("Error during write on LW14UDR");
                        }

                        //Disable I2C-Mode?
                        //iBuffer = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
                        //bytesWritten = fs.writeSync(fd, iBuffer, 0, REPORT_SIZE, 0);
                        //if(bytesWritten != REPORT_SIZE)
                        //    console.log("report buffer not correct: " + bytesWritten + " instead of " + REPORT_SIZE);
                    }

                    fs.closeSync(fd);
                }
                else
                    node.error("Can not open path '/dev/usb/iowarrior1'. Check your USB connection or permissions (0666) needed");
            }
            catch (error) {
                node.status({ fill: "grey", shape: "dot", text: "not-available" });
                console.log(error.name + " : " + error.message);
            }
        });

        node.on('close', function () {
            node.device.close();
        });
    }
    RED.nodes.registerType("command", lw14udr_command);


    function lw14udr_query(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.dali_adr = n.dali_adr;         //device num 0...63
        this.dali_value = n.dali_value;     //value for DALI (0...255, 255 -> MASK)

        var node = this;
        var dali_adr = 0x00;                //BYTE, unsigned char
        var dali_value = node.dali_value;   //BYTE, unsigned char

        node.on("input", function (msg) {
            //Get valid DALI address
            dali_adr = DALI_ADR_SHORT | ((node.dali_adr << 1) & 0xFE) | DALI_MODE_CMD; //Querys work only with single devices
            var wBuffer = Buffer.alloc(REPORT_SIZE);
            var success = true;

            try {
                var fd = fs.openSync(DEVICE_PATH, 'w+');
                if (fd != null) {
                    success = InitReport(fd);  //Init I2C mode from IO-Warrior

                    if (success == true) {
                        //Wait for silent DALI-Bus
                        WaitForReady(fd);

                        //Send Query command
                        wBuffer = Buffer.from([0x02, 0xC4, LW14_I2C, LW14_REG_CMD, parseInt(dali_adr), parseInt(dali_value), 0x00, 0x00]);
                        success = WriteReport(fd, wBuffer);

                        if (success == true) {
                            //Wait for BusReady flag
                            WaitForReady(fd);

                            var error = 0x00;

                            //Wait until data are available
                            error = WaitForReply(fd);

                            if (error == SUCCESS) {
                                success = SetReadRegister(fd, LW14_REG_CMD);

                                if (success == true) {
                                    wBuffer = Buffer.from([0x03, 1, (LW14_I2C | 0x01), LW14_REG_CMD, 0x00, 0x00, 0x00, 0x00]);
                                    var result = ReadReport(fd, wBuffer);

                                    var msg = {};
                                    msg = {
                                        payload: {
                                            address: node.dali_adr,
                                            query: node.dali_value,
                                            value: result
                                        }
                                    };
                                    node.send(msg);
                                }
                                else {
                                    console.log("Error on I2C communication (read/write)");
                                }
                            }
                            else {
                                console.log("Error, no valid data from DALI device");
                            }
                        }
                        else {
                            console.log("Error on I2C communication (read/write)");
                        }
                    }
                    else {
                        console.log("Error on I2C communication (read/write)");
                    }

                    fs.closeSync(fd);
                }
                else
                    node.error("Can not open path '/dev/usb/iowarrior1'. Check your USB connection or permissions (0666) needed");
            }
            catch (err) {
                console.log(err.name + " : " + err.message);
            }
        });

        node.on('close', function () {
            node.device.close();
        });
    }
    RED.nodes.registerType("query", lw14udr_query);


    function lw14udr_scene(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.dali_type = n.dali_type;
        this.dali_adr = n.dali_adr;         //device num 0...63
        this.dali_value = n.dali_value;     //value of DALI (0...255, 255 -> MASK)

        var node = this;
        var dali_adr = 0x00;                //BYTE, unsigned char
        var dali_value = node.dali_value;   //BYTE, unsigned char
        var dali_type = node.dali_type;

        node.on("input", function (msg) {
            //Get valid DALI address
            if (dali_type == 0) dali_adr = DALI_ADR_GROUP | 0xFE | DALI_MODE_CMD;                              //Broadcast
            if (dali_type == 1) dali_adr = DALI_ADR_GROUP | ((node.dali_adr << 1) & 0xFE) | DALI_MODE_CMD;     //Group
            if (dali_type == 2) dali_adr = DALI_ADR_SHORT | ((node.dali_adr << 1) & 0xFE) | DALI_MODE_CMD;     //Short

            dali_value = (dali_value & 0x0F) | 0x10;

            //Buffers for write/read
            var wBuffer = Buffer.alloc(REPORT_SIZE);

            try {
                var fd = fs.openSync(DEVICE_PATH, 'w+');
                if (fd != null) {
                    node.status({ fill: "grey", shape: "dot", text: "Pending" });
                    var success = InitReport(fd);  //Init I2C mode from IO-Warrior

                    if (success == true) {
                        wBuffer = Buffer.from([0x02, 0xC4, LW14_I2C, LW14_REG_CMD, parseInt(dali_adr), parseInt(dali_value), 0x00, 0x00]);
                        success = WriteReport(fd, wBuffer);

                        if (success == true)
                            node.status({ fill: "green", shape: "dot", text: "Success" });
                        else {
                            node.status({ fill: "red", shape: "dot", text: "Error" });
                            node.error("Error during write on LW14UDR");
                        }

                        //Disable I2C-Mode?
                        //iBuffer = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
                        //bytesWritten = fs.writeSync(fd, iBuffer, 0, REPORT_SIZE, 0);
                        //if(bytesWritten != REPORT_SIZE)
                        //    console.log("report buffer not correct: " + bytesWritten + " instead of " + REPORT_SIZE);
                    }

                    fs.closeSync(fd);
                }
                else
                    node.error("Can not open path '/dev/usb/iowarrior1'. Check your USB connection or permissions (0666) needed");
            }
            catch (error) {
                node.status({ fill: "grey", shape: "dot", text: "not-available" });
                console.log(error.name + " : " + error.message);
            }
        });

        node.on('close', function () {
            node.device.close();
        });
    }
    RED.nodes.registerType("scene", lw14udr_scene);

}