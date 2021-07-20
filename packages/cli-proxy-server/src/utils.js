'use strict';
const address = require('address');

module.exports = {
    getHost: function () {
        return address.ip()
    },
    getPort: function () {
        return 8080
    }
}


