import https from 'https';

import { version } from '../../package.json';

const getLatestVersion = (packageName: string) => {
    return new Promise((resolve, reject) => {
        https.get(`https://registry.npmjs.org/${packageName}/latest`, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const latest = JSON.parse(data).version;
                    resolve(latest);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
};

const packageName = 'inkdrop-visualizer';
export const warnUserIfNotLatestVersion = async () => {
    try {
        const latestVersion = await getLatestVersion(packageName);
        if (version !== latestVersion) {
            console.log('\x1b[33m%s\x1b[0m', "Warning: Inkdrop version is " + version + " yet version " + latestVersion + " is available. Please update the package. Should the issue persist, please open a ticket, including this log. We're looking forward to help.");  //yellow
        }
    } catch (error) {
        console.log('\x1b[33m%s\x1b[0m', "Failed to check for updates. Skipping.")
    }
};