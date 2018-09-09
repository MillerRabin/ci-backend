exports.Error = function (data) {
    Object.assign(this, data);
};

require('util').inherits(exports.Error, Error);

const gDefTable = {
    '23505': { message: 'already exists', code: 'alreadyExists' }
};

function getPostgresError(err, errTable) {
    function getFromTable(code, message) {
        const data = (errTable != null) && (errTable[code] != null) ?
                     errTable[code] :
                     (gDefTable[code] != null) ? gDefTable[code] : null;

        if (data == null) return {
            code: code,
            message: message
        };
        return {
            code: 'alreadyExists',
            message: data.message
        };
    }

    if (err.message == null) return null;
    return getFromTable(err.code, err.detail);
}

exports.koa = async (ctx, next) => {
    try {
        let data = await next();
        if ((data != null) && (ctx.body == null))
            ctx.body = data;
    } catch (err) {
        console.log(err);
        if (err instanceof exports.Error) {
            ctx.status = 400;
            ctx.body = err;
            return;
        }

        const data = getPostgresError(err, null);
        if (data != null) {
            ctx.status = 400;
            ctx.body = data;
            return;
        }

        ctx.status = err.statusCode || err.status || 500;
        ctx.body = {
            message: err.message
        }
    }
};

exports.buildMultipartData = (data) => {
    const reg = new RegExp(/^(.+)\[(.+)]$/);
    const res = {};
    for (let key in data) {
        if (!data.hasOwnProperty(key)) continue;
        const objectData = reg.exec(key);
        if (objectData != null) {
            const aKey = objectData[1];
            const aField = objectData[2];
            if (res[aKey] == null) res[aKey] = {};
            res[aKey][aField] = data[key];
            continue;
        }
        res[key] = data[key];
    }
    return res;
};

exports.buildMultipartArray = (data) => {
    const reg = new RegExp(/^(\d+)\[(.+)]$/);
    const res = [];
    const keys = {};
    for (let key in data) {
        if (!data.hasOwnProperty(key)) continue;
        let arrayData = reg.exec(key);
        if (arrayData != null) {
            let aKey = arrayData[1];
            let aField = arrayData[2];
            if (keys[aKey] == null) keys[aKey] = res.push({});
            let obj = res[keys[aKey] - 1];
            obj[aField] = data[key];
            continue;
        }
        res[key] = data[key];
    }
    return res;
};