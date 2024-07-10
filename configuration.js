/**
 *
 * Xact NodeJS Proxy Configruation File
 * Copyright 2020 Woolworths Limited
 *
 */
module.exports = {
  TARGETPATH: ".",
  LOG_DIR: ".logs",
  LOG_EXCEPTION_FILE: "EXCEPTIONS-xactlog.log",
  LOG_FILE_PREFIX: "xact",
  LOG_TIMEZONE: "Australia/Sydney",
  LOG_TIME_FORMAT: "en-AU",
  SERVER_PORT: 8080,
  INSURER_URL: "https://insurertrn.realinsurance.com.au:9443",
  HOST_URL: "https://xact-insurance-app-service-dev.azurewebsites.net",
  USE_PROXY: true,
  PROXY_SERVER: "http://Local-Proxy.woolworths.com.au:80",
  DEBUG_MODE: true,
  DEBUG_MODE_PRINT_REQUEST_COOKIES: false,
  DEBUG_MODE_PRINT_RESPONSE_COOKIES: false,
  DEBUG_MODE_PRINT_REQUEST_URL: fasle,
  DEBUG_MODE_PRINT_RESPONSE_URL: true,
}
