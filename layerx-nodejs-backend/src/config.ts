/**
 * @module config
 * Purpose of this module is to configure various add-ons such as custom loggers
 * @description configurations for addons/dev tools
 */
import * as log4js from 'log4js';

// standard console and file output configuration for log4js
log4js.configure({
  appenders: {
    file: {type: 'file', filename: 'logs/server.log'},
    console: {type: 'console'},
  },
  categories: {
    default: {appenders: ['file', 'console'], level: 'debug'},
  },
  pm2: true,
  disableClustering: true,
});

/**
 * Log into file and console.
 */
export const logger = log4js.getLogger('SERVER'); // default logger
export const webhookLog = log4js.getLogger('WEBHOOK'); // not used
