const pug = require('pug');
const Router = require('koa-router');
const koaBody = require('koa-body');
const path = require('path');
const response = require('../../middlewares/response.js');

exports.template = (info) => {
    return pug.renderFile(path.join(__dirname, 'templates', info.template), info.data);
};

exports.addController = (application, controllerName) => {
    const router = new Router();
    router.post('/' + controllerName + '/template', koaBody(), async (ctx) => {
        return exports.template(ctx.request.body).catch((err) => {
            throw new response.Error(err);
        });
    });

    application.use(router.routes());
};
