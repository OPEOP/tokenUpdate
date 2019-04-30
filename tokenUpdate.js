const fs = require('fs');
const https = require('https');

// Set your login, password and update interval
const LOGIN = '';
const PASSWORD = '';
const HOST_NAME = ''; // site.domain.net
const PATH = ''; // /some/path?param=value&param2=value2
const PATH_TO_FILE = ''; // ./PORTAL/index.html
const HOURS_INTERVAL = 3; // (INT) The token will be updated every 3 hours

const interval = 1000 * 60 * 60 * HOURS_INTERVAL;
const red = '\x1b[31m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
let AUTO_UPDATE = false;

const PARAMS = {
    AUTO_UPDATE: '-a'
};

process.argv.forEach(function(val) {
    if (val === PARAMS.AUTO_UPDATE) {
        AUTO_UPDATE = true;
    }
});

function getNewToken(callback) {
    const options = {
        method: 'POST',
        hostname: HOST_NAME,
        path: PATH,
        headers: {
            'X-OpenAM-Username': LOGIN,
            'X-OpenAM-Password': PASSWORD,
            'cache-control': 'no-cache',
            'Content-Type': 'application/json'
        }
    };

    const req = https.request(options, res => {
        showMessage(`statusCode: ${res.statusCode}`);

        const chunks = [];

        res.on('data', chunk => {
            chunks.push(chunk);
        });

        res.on('end', () => {
            const body = Buffer.concat(chunks);
            let result;

            try {
                result = JSON.parse(body.toString());
                showSuccess('NEW TOKEN IS:', result.tokenId);
            } catch (e) {
                showError('ERROR:', e);
                callback(null);
            }

            callback(result.tokenId);
        });
    });

    req.on('error', error => {
        showError('FAILED NETWORK CONNECTION:', error);
        showError('YOU NEED TO CHECK YOUR TUNNEL OR NETWORK CONNECTION');
    });

    req.end();
}

function writeToken(token, success, failure) {
    fs.readFile(PATH_TO_FILE, 'utf8', (err, data) => {
        if (err) {
            failure(err);
            return 1;
        }

        const reg = /window\.RMM\.iPlanetDirectoryPro = ['].*['];$/m;
        const template = `window.RMM.iPlanetDirectoryPro = '${token}';`;
        const newData = data.replace(reg, template);

        fs.writeFile(PATH_TO_FILE, newData, 'utf8', err => {
            if (err) {
                failure(err);
                return 1;
            }

            success();
        });
    });
}

function updateToken() {
    getNewToken(token => {
        if (!token) {
            return 1;
        }

        writeToken(
            token,
            () => {
                const date = new Date();
                showSuccess('UPDATE WAS SUCCESSFUL:', date.toString());
                showMessage(
                    `Next update in ${HOURS_INTERVAL} ${HOURS_INTERVAL > 1 ? 'hours' : 'hour'}`
                );
            },
            err => {
                showError('Here we have some issues:', err);
            }
        );
    });
}

function showError(message, error) {
    console.log(red, `\n${message}`);
    if (error) {
        console.log(error);
    }
}

function showSuccess(message, data = '') {
    console.log(green, `\n${message} `, data);
}

function showMessage(message) {
    console.log(yellow, `\n${message}`);
}

function run() {
    let timerCount = 1;

    updateToken();

    if (AUTO_UPDATE) {
        const timerId = setInterval(() => {
            updateToken();
            timerCount++;

            console.log(timerCount);

            if (timerCount === Math.round(12 / HOURS_INTERVAL)) {
                showMessage('YOU NEED TO REST! GO HOME!');
                clearInterval(timerId);
            }
        }, interval);
    }
}

run();
