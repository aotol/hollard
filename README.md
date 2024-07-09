Xact NodeJS Proxy
=================

This NodeJS application acts as bridge/proxy between Hollard Insurer and WooliesX Xact system.

**Here are the changes for this version**

1. Aligned and unit tested for NodeJS v14.7.1.
2. NodeJS modules were erased and reinstalled one by one - and installing only those that are need - dramatically reducing modules disk size. These are also the latest modules compatible with the aforementioned version of NodeJS (v14.7.1).
3. Unnecessary/deprecated lines from hollard.js file were removed.
4. Hardcoded port number, URLs and other flags are now stored in configuration.js file. Previously, the source code of main program (hollard.js) as well as the request handler (../routes/index.js) needed to be modified when moving between environments, hosts or changing port numbers. With this change, all configurations are now in that single file.
5. Logging was also enhanced. We introduced multiple files (rotating depending on date and time) for the logging so that it will be easy to find logs at specific date and time. We also enhanced the log files readably. The time zone and format for logging can also be set via the configuration.js file (previously, it was in GMT/UTC time zone).
6. Unnecessary files and codes were also deleted.
7. Removed SSL/HTTPS related codes and files. Azure will handle HTTPS/TLS.
