This set of node-red nodes communicate with the LED-Warrior14U-DR on a Raspberry PI.

------------

### Install NODE
Copy the folder 'node-cm-lw14udr' into ~./node-red/node_modules and start/restart your Node-Red server.

------------


### Permissions
You have to grant permissions for using the USB interface for the LED-Warrior14U-DR.
Copy the 99-iowarrior.rules file into '/etc/udev/rules.d' or '/lib/udev/rules.d/' and
reload the rules by using 'udevadm control --reload-rules && udevadm trigger' or replug the 
LED-Warrior14U-DR.

------------

### Usage
The nodes have the following values:

- Type: The device type to send data to all devices (broadcast), a group, or a single device (short).
- Device adr.: Set a device address which receive the data. Value between 0...63 are valid for single devices, 0...15 for groups, and for broadcast this value will be ignored. Based on the 'Type' the address  will be masked automatically.
- Value: Valid values are between 0...254. A value of 255 (or MASK) will be ignored by the device.

------------


##### Node: dacp
Send a DACP (direct light output) value to a device/group/broadcast. The value 0..254 based on the output of the device (linear or logarithmic). For more information about the steps please take a look into the data sheet of your device.

------------

##### Node: command
Send a COMMAND value to a device/group/broadcast. The basic commands are:

- OFF = 0x00 (0)        -> Set the output to 0
- UP = 0x01 (1)       -> Dimm up to the next step.
- DOWN = 0x02 (2)       -> Dimm down to the previous step.
- STEP_UP = 0x03 (3)       -> Single step up to the next value (x = x+1)
- STEP_DOWN = 0x04 (4)       -> Single step down to the next value (x = x-1)
- MAX = 0x05 (5)       -> Call the max output
- MIN = 0x06 (6)       -> Call the min output
- STEP_DOWN_OFF = 0x07 (7)       -> Single step down, if last step will be 0 set it off
- ON_STEP_UP = 0x08 (8)       -> Single step up if off

------------

##### Node: query
Get a value from specific devices. Groups or broadcast are not allowed/possible.
This function will get information about the devices like 'actual level' or status.
Most used value are:

- QUERY_STATUS = 0x90 (144)      -> Get the status (1 Byte). Each bit represent a status.
- QUERY_ACTUAL_LEVEL = 0xA0 (160)      -> Get the actual output value (0..254)

There are many more QUERY commands, for more information please take a look into the DIN IEC62386 standard.

------------

##### Node: scene
Call a scene for a device/group/broadcast. All addressed devices will show the scene value directly.
Each DALI(*) device allows storing up to 16 scene values to create scenes for your light environment. Value: 0..15 are valid

------------

### Important Note
This node is created to use the LED-Warrior14U-DR with a Raspberry PI.
For more information about IEC62386 bus: https://www.dali-alliance.org/

------------

### Known issues
- This node will only work for one connected LED-Warrior14U-DR on a Raspberry PI.
  The reason is this node use the 'fs' library from nodejs and connects to the first found LED-Warrior14U-DR.
- Without right permissions the default user 'pi' have no access to the LED-Warrior14U-DR.

------------


### Links and further information
https://codemercs.com/en/light-interface/master
https://codemercs.com/en/light-interface/basics
https://codemercs.com/en/light-interface/busmaster-software (Windows software for LW14U-DR)
https://de.wikipedia.org/wiki/Digital_Addressable_Lighting_Interface

------------

### Trademarks
*DALI is a registered trademark of DIIA
