const Router = require('koa-router');
const koaBody = require('koa-body');
const response = require('../../middlewares/response.js');

async function logGit(pobj) {
    const addQuery = 'insert into git_logs (event_data, deploy_results, error) values($1, $2, $3)';
    const params = [
        pobj.data,
        (pobj.deployResult == null) ? null : pobj.deployResult,
        (pobj.error == null) ? null : pobj.error
    ];
    return await pobj.connection.query(addQuery, params);
}

async function getProject(connection, data) {
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
    const pdata = await connection.query(getQuery, params);
    if (pdata.length == 0) return null;
    return pdata.rows[0];
}

function parseBitbucketStructure(data) {
    const repository = data.repository;
    if (repository == null) throw new response.Error({ repository: 'Invalid repository'});
    const projectName = repository.name;
    if (projectName == null) throw new response.Error({ project: 'Invalid project name'});
    const push = data.push;
    if (push == null) return null;
    const changes = push.changes;
    if (changes == null) throw new response.Error({ changes: 'Invalid changes structure'});
    const newChanges = changes.new;
    if (newChanges == null) throw new response.Error({ 'changes.new': 'Invalid changes new structure'});
    const branchName = newChanges.name;
    if (branchName == null) throw new response.Error({ branch: 'Invalid branch name'});
    return { project: projectName, branch: branchName };
}

async function deployProject(connection, data) {
    const obj = parseBitbucketStructure(data);
    if (obj == null) return null;
    const pdata = await getProject(connection, obj);
    console.log(pdata);
    return { success: true };
}

exports.addController = (application, controllerName) => {
    const router = new Router();

    router.post('/' + controllerName + '/bitbucket', koaBody(), async (ctx) => {
        const data = ctx.request.body;
        const connection = await application.pool.connect();
        try {
            try {
                const deployResult = await deployProject(data);
                await logGit({ connection, data, deployResult });
            } catch (e) {
                await logGit({ connection, data, error: e });
                throw e;
            }
        } finally {
            await connection.release();
        }
    });

    application.use(router.routes());
};