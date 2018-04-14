const Router = require('koa-router');
const koaBody = require('koa-body');
const response = require('../../middlewares/response.js');
const deploy = require('../deploy/deploy.js');

async function logGit(pobj) {
    const addQuery = 'insert into git_logs (event_data, deploy_results, error) values($1, $2, $3)';
    const params = [
        pobj.data,
        (pobj.deployResult == null) ? null : pobj.deployResult,
        (pobj.error == null) ? null : pobj.error
    ];
    return await pobj.connection.query(addQuery, params);
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
    const firstChanges = changes[0];
    if (firstChanges == null) throw new response.Error({ changes: 'Changes must be array'});
    const newChanges = firstChanges['new'];
    if (newChanges == null) throw new response.Error({ 'changes.new': 'Invalid changes new structure'});
    const branchName = newChanges.name;
    if (branchName == null) throw new response.Error({ branch: 'Invalid branch name'});
    return { project: projectName, branch: branchName };
}

async function deployProject(connection, data) {
    const obj = parseBitbucketStructure(data);
    if (obj == null) return { text: 'Can`t get information from bitbucket structure'};
    const pdata = await deploy.getProject(connection, obj);
    if (pdata == null) return { text: 'No project to deploy' };
    return await deploy.start(pdata);
}

exports.addController = (application, controllerName) => {
    const router = new Router();

    router.post('/' + controllerName + '/bitbucket', koaBody(), async (ctx) => {
        const data = ctx.request.body;
        const connection = await application.pool.connect();
        try {
            try {
                const deployResult = await deployProject(connection, data);
                await logGit({ connection, data, deployResult });
                setTimeout(() => {
                    deployResult.reload();
                }, 1000);
                return { success: true };
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