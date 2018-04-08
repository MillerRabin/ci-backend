const db = require('../postgres/postgres.js');
const Router = require('koa-router');
const koaBody = require('koa-body');
const response = require('../../middlewares/response.js');

exports.addController = (application, controllerName) => {
    const router = new Router();

    router.post('/' + controllerName, koaBody(), async (ctx) => {
        const data = ctx.request.body;
        console.log(data);
        return { success: 'true'};
    });

    application.use(router.routes());
};