const db = require('../postgres/postgres.js');
const Router = require('koa-router');
const koaBody = require('koa-body');
const response = require('../../middlewares/response.js');

async function logGit(connection, data) {
    const addQuery = 'insert into git_logs (event_data) values($1)';
    const params = [data];
    return await connection.query(addQuery, params);
}

exports.addController = (application, controllerName) => {
    const router = new Router();

    router.post('/' + controllerName + '/bitbucket', koaBody(), async (ctx) => {
        const data = ctx.request.body;
        const connection = await application.pool.connect();
        try {
            await logGit(connection, data);
            return { success: true };
        } finally {
            await connection.release();
        }
    });

    application.use(router.routes());
};