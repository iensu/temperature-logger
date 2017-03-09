const rpio = require('rpio');
const fs = require('fs');
const path = require('path');
const LCD = require('lcd');
const debounce = require('debounce');

const LOG_INTERVAL = 10 * 60 * 1000; // 10 minutes
const DEVICES_PATH = '/sys/bus/w1/devices';
const DEVICE_SERIAL_NO = '28-800000271664';
const GREEN_LED = 19;
const RED_LED = 26;

const blink = (pin, duration = 200) => () => {
  rpio.write(pin, rpio.HIGH);
  setTimeout(() => rpio.write(pin, rpio.LOW), duration);
};
const signalSuccessfulRead = blink(GREEN_LED);
const signalError = () => rpio.write(RED_LED, rpio.HIGH);

function log(msg) {
  console.log(new Date().toISOString(), msg);
}
const logDebounced = debounce(log, LOG_INTERVAL);

function parseTemperature(data) {
  /* parse the following format
     59 01 ff ff 7f ff ff ff 82 : crc=82 YES
     59 01 ff ff 7f ff ff ff 82 t=21562
  */
  const temperatureLine = data.split('\n')[1];
  const temperatureString = /t=(\d+)$/.exec(temperatureLine)[1];
  return parseInt(temperatureString, 10) / 1000;
}

function readTemperature() {
  const filePath = path.join(DEVICES_PATH, DEVICE_SERIAL_NO, 'w1_slave');
  const data = fs.readFileSync(filePath).toString();
  return parseTemperature(data.trim());
}

const writeTemperature = (lcd) => (temperature) => {
  lcd.setCursor(0, 0);
  lcd.print(`${new Date().toString().substring(16, 24)} ${temperature.toFixed(1)}C`);
};

const run = (writeFn) => () => {
  const temperature = readTemperature();
  writeFn(temperature);
  signalSuccessfulRead();
  logDebounced(temperature);
};

try {
  rpio.init({ mapping: 'gpio' });
  rpio.open(GREEN_LED, rpio.OUTPUT);
  rpio.open(RED_LED, rpio.OUTPUT);

  const lcd = new LCD({
    rs: 25,
    e: 24,
    data: [23, 17, 21, 22],
    cols: 8,
    rows: 2
  });

  lcd.on('ready', () => setInterval(run(writeTemperature(lcd)), 1000));
} catch (err) {
  signalError();
  console.error(err);
}

