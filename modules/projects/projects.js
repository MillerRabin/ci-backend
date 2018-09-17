const Router = require('koa-router');
const koaBody = require('koa-body');
const response = require('../../middlewares/response.js');
const client = require('raintech-auth-client');
const db = require('../postgres/postgres.js');

exports.getProject = async (connection, data) => {
    data.limit = 1;
    const pdata = await exports.get({ connection, query: data, rowMode: 'json' });
    if (pdata.rows.length == 0) return null;
    return pdata.rows[0];
};

exports.get = async ({connection, query, rowMode = 'array'}) => {
    const limit = (query.limit == null) ? 100 : query.limit;
    const params = [ limit ];
    const where = [];
    if (query.owner != null) where.push(`owner = $${ params.push(query.owner) }`);
    if (query.id != null) where.push(`id = $${ params.push(query.id) }`);
    if (query.project != null) where.push(`project_name = $${ params.push(query.project) }`);
    if (query.branch != null) where.push(`branch = $${ params.push(query.branch) }`);
    if (where.length == 0) throw new response.Error({ message: 'There are no valid fields'});
    const getQuery = [
        'select * from projects',
        (where.length > 0) ? 'where ' + where.join(' and ') : '',
        'order by project_name',
        'limit $1'
    ];
    const dbQuery = {
        text: getQuery.join(' '),
        values: params,
        rowMode: rowMode
    };
    return await connection.query(dbQuery);
};

exports.add = async ({connection, query }) => {
    const fields = [];
    const values = [];
    const params = [];
    if (query.owner != null) {
        fields.push('owner');
        values.push( `$${ params.push(query.owner) }`);
    }
    if (query.project_name != null) {
        fields.push('project_name');
        values.push( `$${ params.push(query.project_name) }`);
    }
    if (fields.length == 0) throw new response.Error({ message: 'There are no valid fields'});
    const addQuery = [
        `insert into projects (${ fields.join(',')})`,
        `values ( ${ values.join(', ')})`,
        'returning *'
    ];
    const dbQuery = {
        text: addQuery.join(' '),
        values: params,
        rowMode: 'json'
    };
    return await connection.query(dbQuery);
};

exports.delete = async ({connection, query }) => {
    const where = [];
    const params = [];
    if (query.owner != null) where.push( `owner = $${ params.push(query.owner) }`);
    if (query.id != null) where.push( `id = $${ params.push(query.id) }`);

    if (where.length == 0) throw new response.Error({ message: 'There are no valid fields'});
    const delQuery = [
        'delete from projects',
        `where ( ${ where.join(' and ')})`
    ];
    const dbQuery = {
        text: delQuery.join(' '),
        values: params
    };
    return await connection.query(dbQuery);
};

exports.update = async ({ connection, query}) => {
    if (query.id == null) throw new response.Error({ id: 'id expected'});
    const params = [query.id];
    const where = ['(id = $1)'];
    if (query.owner != null)
        where.push(`(owner = $${ params.push(query.owner)})`);

    const uQuery = [];
    if (query.repository != null) uQuery.push(`repository = $${ params.push(query.repository) }`);
    if (query.project_name != null) uQuery.push(`project_name = $${ params.push(query.project_name) }`);
    if (query.branch != null) uQuery.push(`branch = $${ params.push(query.branch) }`);
    if (query.project_data != null) uQuery.push(`project_data = $${ params.push(JSON.stringify(query.project_data)) }`);

    const dbQuery = {
        text: `update projects set ${ uQuery.join(', ')} where ${ where.join(' and ')}`,
        values: params,
    };
    const rData = await connection.query(dbQuery);
    if (rData.rowCount == 0) throw new response.Error({ message: 'No project updated'});
    return { message: 'update success' };
};

exports.addController = (application, controllerName) => {
    const router = new Router();
    router.post('/' + controllerName + '/get', koaBody(), async (ctx) => {
        const data = ctx.request.body;
        if (data.certificate == null) throw new response.Error({ certificate: 'certificate expected'});
        const session = await client.check(data.certificate);
        const sData = { owner: session.userId };
        if (data.id != null) sData.id = data.id;
        const connection = await application.pool.connect();
        try {
            return db.formatResponse(await exports.get({
                connection,
                query: sData
            }));
        } finally {
            await connection.release();
        }
    });

    router.post('/' + controllerName, koaBody(), async (ctx) => {
        const data = ctx.request.body;
        if (data.certificate == null) throw new response.Error({ certificate: 'certificate expected'});
        const session = await client.check(data.certificate);
        data.owner = session.userId;
        delete data.certificate;
        const connection = await application.pool.connect();
        try {
            return db.formatResponse(await exports.add({
                connection,
                query: data
            }));
        } finally {
            await connection.release();
        }
    });

    router.put('/' + controllerName, koaBody({ strict: false }), async (ctx) => {
        const data = ctx.request.body;
        if (data.certificate == null) throw new response.Error({ certificate: 'certificate expected'});
        const session = await client.check(data.certificate);
        delete data.certificate;
        data.owner = session.userId;

        const connection = await application.pool.connect();
        try {
            return await exports.update({connection, query: data });
        } finally {
            await connection.release();
        }
    });

    router.delete('/' + controllerName, koaBody({ strict: false }), async (ctx) => {
        const data = ctx.request.body;
        if (data.id == null) throw new response.Error({ id: 'id expected'});
        if (data.certificate == null) throw new response.Error({ certificate: 'certificate expected'});
        const session = await client.check(data.certificate);
        delete data.certificate;
        data.owner = session.userId;

        const connection = await application.pool.connect();
        try {
            return await exports.delete({connection, query: data });
        } finally {
            await connection.release();
        }
    });

    application.use(router.routes());
};
