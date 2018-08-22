const Router = require('koa-router');
const koaBody = require('koa-body');
const path = require('path');
const response = require('../../middlewares/response.js');
const certificate = require('../certificate/certificate.js');
const db = require('../postgres/postgres.js');

exports.getProject = async (connection, data) => {
    const params = [];
    const where = [];
    if (data.project != null) where.push(`project_name = $${ params.push(data.project) }`);
    if (data.branch != null) where.push(`branch = $${ params.push(data.branch) }`);
    if (where.length == 0) throw new response.Error({ text: 'Invalid parameters'});
    const getQuery = [
        'select * from projects',
        (where.length > 0) ? 'where ' + where.join(' and ') : '',
        'limit 1'
    ];
    const pdata = await connection.query(getQuery.join(' '), params);
    if (pdata.rows.length == 0) return null;
    return pdata.rows[0];
};

exports.get = async ({connection, query, rowMode = 'array'}) => {
    const params = [];
    const where = [];
    if (query.owner != null) where.push(`owner = $${ params.push(query.owner) }`);
    if (where.length == 0) throw new response.Error({ text: 'There are no valid fields'});
    const getQuery = [
        'select * from projects',
        (where.length > 0) ? 'where ' + where.join(' and ') : ''
    ];
    const dbQuery = {
        text: getQuery.join(' '),
        values: params,
        rowMode: rowMode
    };
    return await connection.query(dbQuery);
};

exports.addController = (application, controllerName) => {
    const router = new Router();
    router.post('/' + controllerName + '/get', koaBody(), async (ctx) => {
        const data = ctx.request.body;
        if (data.certificate == null) throw new response.Error({ certificate: 'certificate expected'});
        const session = await certificate.check(data.certificate);
        const connection = await application.pool.connect();
        try {
            return db.formatResponse(await exports.get({
                connection,
                query: {
                    owner: session.userId
                }
            }));
        } finally {
            await connection.release();
        }
    });

    application.use(router.routes());
};
