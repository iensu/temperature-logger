const rpio = require('rpio');
const fs = require('fs');
const path = require('path');

const DEVICES_PATH = '/sys/bus/w1/devices';
const DEVICE_SERIAL_NO = '28-800000271664';
const GREEN_LED = 18;
const RED_LED = 23;

rpio.init({  mapping: 'gpio' });
rpio.open(GREEN_LED, rpio.OUTPUT);
rpio.open(RED_LED, rpio.OUTPUT);

const blink = (pin, duration = 200) => () => {
  rpio.write(pin, rpio.HIGH);
  setTimeout(() => rpio.write(pin, rpio.LOW), duration);
}
const signalSuccessfulRead = blink(GREEN_LED);
const signalError = () => rpio.write(RED_LED, rpio.HIGH);

function getTemperature(data) {
  /* parse the following format
     59 01 ff ff 7f ff ff ff 82 : crc=82 YES
     59 01 ff ff 7f ff ff ff 82 t=21562
  */
  const temperatureLine = data.split('\n')[1];
  const temperatureString = /t=(\d+)$/.exec(temperatureLine)[1];
  return parseInt(temperatureString, 10) / 1000;
}

function readTemp() {
  const filePath = path.join(DEVICES_PATH, DEVICE_SERIAL_NO, 'w1_slave');
  const data = fs.readFileSync(filePath).toString();
  const temperature = getTemperature(data.trim());
  console.log(new Date().toISOString(), temperature);
  signalSuccessfulRead();
}

/* MAIN */

try {
  const interval = process.argv.length > 2 ? parseInt(process.argv[2], 10) * 1000 : 5 * 60 * 1000;

  readTemp();
  setInterval(readTemp, interval);
} catch (err) {
  signalError();
  console.error(err);
}
