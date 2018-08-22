const fs = require('fs');
const Url = require('url');
const http = require('http');
const https = require('https');
const util = require('util');
const http2 = require('http2');
const writeFile = util.promisify(fs.writeFile);
const config = require('../../config.js');

function request(protocol, params, postData) {
    return new Promise((resolve, reject) => {
        const data = [];
        const req = protocol.request(params, (res) => {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                data.push(chunk);
            });
            res.on('end', function () {
                if (res.statusCode >= 400) {
                    return reject(data.join(''));
                }
                return resolve(data.join(''));
            });
        });
        req.on('error', function (e) {
            return reject(e);
        });

        if (postData != null)
            req.write(postData);
        req.end();
        return req;
    });
}

function request2(params, postData) {
    return new Promise((resolve, reject) => {
        const {
            HTTP2_HEADER_PATH,
            HTTP2_HEADER_METHOD
        } = http2.constants;

        const client = http2.connect(`${params.protocol}//${params.host}`);
        client.on('error', (err) => reject(err));
        const rObj = {
            [HTTP2_HEADER_PATH]: params.pathname,
            [HTTP2_HEADER_METHOD]: params.method
        };

        let buffer = null;
        if (postData != null) {
            buffer = Buffer.from(postData);
            rObj["Content-Type"] = "application/json";
            rObj["Content-Length"] = buffer.length;
        }

        const req = client.request(rObj);
        req.setEncoding('utf8');
        const data = [];
        req.on('data', (chunk) => {
            data.push(chunk)
        });
        req.on('end', () => {
            client.close();
            resolve(data.join(''));
        });
        if (buffer != null)
            req.write(buffer);
        req.end();
    });
}

exports.request = async (url, method, postData, headers) => {
    const params = Url.parse(url);
    params.method = method;
    params["rejectUnauthorized"] = false;
    let protocol = http;
    if (params.protocol == 'https:')
        protocol = https;
    params.headers = (headers == null) ? {} : headers;
    if (config.useHttp2)
        return await request2(params, postData);
    else
        return await request(protocol, params, postData);
};

exports.requestFile = async (file) => {
    let result = await exports.request({
        hostname: host,
        method: 'get',
        path: '/client/modules/' + file,
        headers: {
            'Content-Type': 'text/javascript'
        }
    });
    return await writeFile('modules/' + file, result);
};

exports.put = function(url, data, headers) {
    return exports.request(url, 'PUT', data, headers);
};

exports.post = async (url, data, headers) => {
    return await exports.request(url, 'POST', data, headers);
};

exports.delete = function(url, data, headers) {
    return exports.request(url, 'DELETE', data, headers);
};

exports.get = function(url, headers) {
    return exports.request(url, 'GET', null, headers);
};

function getJsonData(data) {
    let res = { text: 'No JSON Data'};
    try {
        res = JSON.parse(data)
     } catch (e) {

    }
    return res;
}

exports.getJSON = async (url) => {
    let results = await exports.get(url, {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    });
    return JSON.parse(results);
};

exports.postJSON = async (url, data) => {
    try {
        let postData = JSON.stringify(data);
        let results = await exports.post(url, postData, { 'Content-Type': 'application/json' });
        return JSON.parse(results);
    } catch (err) {
        throw getJsonData(err);
    }
};

exports.putJSON = async (url, data) => {
    let putData = JSON.stringify(data);
    let results = await exports.put(url, putData, { 'Content-Type': 'application/json'});
    return JSON.parse(results);
};

exports.deleteJSON = async (url, data) => {
    let deleteData = JSON.stringify(data);
    let results = await exports.delete(url, deleteData, { 'Content-Type': 'application/json'});
    return JSON.parse(results);
};