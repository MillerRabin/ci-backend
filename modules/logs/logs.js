const Router = require('koa-router');
const koaBody = require('koa-body');
const response = require('../../middlewares/response.js');
const db = require('../postgres/postgres.js');
const certificate = require('../certificate/certificate.js');

exports.get = async ({ connection, query = {}, rowMode = 'array' }) => {
    const params = [
        (query.limit == null) ? 10 : query.limit,
        (query.offset == null) ? 0 : query.offset
    ];
    const where = [];
    if (query.project != null)
        where.push(`event_data -> 'repository' -> 'name' project_name' = $${ params.push(query.project) }`);

    const getQuery = [
        'select event_time, event_data, deploy_results, error from git_logs',
        (where.length > 0) ? 'where ' + where.join(' and ') : '',
        'limit $1 offset $2'
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

    router.post('/' + controllerName, koaBody(), async (ctx) => {
        const data = ctx.request.body;
        if (data.certificate == null) throw new response.Error({ certificate: 'certificate expected'});
        const session = await certificate.check(data.certificate);
        const connection = await application.pool.connect();
        try {
            return db.formatResponse(await exports.get({ connection, query: data }));
        } finally {
            await connection.release();
        }
    });

    application.use(router.routes());
};