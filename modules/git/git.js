const Router = require('koa-router');
const koaBody = require('koa-body');
const response = require('../../middlewares/response.js');
const deploy = require('../deploy/deploy.js');
const projects = require('../projects/projects.js');
const client = require('raintech-auth-client');

function copyError(error) {
    const res = {};
    for (let key in error) {
        if (!error.hasOwnProperty(key)) continue;
        res[key] = error[key];
    }
    return res;
}

async function logGit(pobj) {
    const connection = await pobj.application.pool.connect();
    try {
        const addQuery = 'insert into git_logs (event_data, deploy_results, error, owner) values($1, $2, $3, $4)';
        const params = [
            JSON.stringify(pobj.data),
            (pobj.deployResult == null) ? null : JSON.stringify(pobj.deployResult),
            (pobj.error == null) ? null : copyError(pobj.error),
            pobj.owner
        ];
        return await connection.query(addQuery, params);
    } finally {
        await connection.release();
    }
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

function parseGitLabStructure(data) {
    const repository = data.repository;
    if (repository == null) throw new response.Error({ repository: 'Invalid repository'});
    const projectName = repository.name;
    if (projectName == null) throw new response.Error({ project: 'Invalid project name'});
    const ref = data.ref;
    if (typeof(ref) != 'string') throw new response.Error({ ref: 'Ref must be string'});
    const refs = ref.split('/');
    const branchName = refs[refs.length - 1];
    return { project: projectName, branch: branchName };
}

async function deployProject(connection, data) {
    const pdata = await projects.getProject(connection, data);
    if (pdata == null) return { results: { text: 'No project to deploy', data: data }};
    return {
        project: pdata,
        results: await deploy.start(pdata)
    };
}

async function deployProjectBitbucket(connection, data) {
    const obj = parseBitbucketStructure(data);
    if (obj == null) return { results: { text: 'Can`t get information from bitbucket structure' }};
    return await deployProject(connection, obj);
}

async function deployProjectGitLab(connection, data) {
    const obj = parseGitLabStructure(data);
    if (obj == null) return { results: { text: 'Can`t get information from gitlab structure' }};
    return await deployProject(connection, obj);
}


exports.addController = (application, controllerName) => {
    const router = new Router();

    async function processResults(dr, logData) {
        const deployResult = dr.results;
        const owner = (dr.project == null) ? null : dr.project.owner;
        logData.project = dr.project;
        setTimeout(async () => {
            if (Array.isArray(deployResult)) {
                for (let dr of deployResult)
                    if (dr.reload != null) dr.reload = await dr.reload();
            }
            await logGit({ application, data: logData, deployResult, owner });
        }, 1000);
    }

    router.post('/' + controllerName + '/bitbucket', koaBody(), async (ctx) => {
        const data = ctx.request.body;
        const connection = await application.pool.connect();
        const logData = { request: data };
        try {
            try {
                const dr = await deployProjectBitbucket(connection, data);
                await processResults(dr, logData);
                return { success: true };
            } catch (e) {
                await logGit({ application, data: logData, error: e });
                throw e;
            }
        } finally {
            await connection.release();
        }
    });

    router.post('/' + controllerName + '/gitlab', koaBody(), async (ctx) => {
        const data = ctx.request.body;
        const connection = await application.pool.connect();
        const logData = { request: data };
        try {
            try {
                const dr = await deployProjectGitLab(connection, data);
                await processResults(dr, logData);
                return { success: true };
            } catch (e) {
                await logGit({ application, data: logData, error: e });
                throw e;
            }
        } finally {
            await connection.release();
        }
    });

    router.post('/' + controllerName + '/manual', koaBody(), async (ctx) => {
        const data = ctx.request.body;
        if (data.certificate == null) throw new response.Error({ message: 'certificate expected'});
        if (data.id == null) throw new response.Error({ id: 'id of project expected'});
        const session = await client.check(data.certificate);
        delete data.certificate;
        const connection = await application.pool.connect();
        const logData = { request: data };
        try {
            try {
                const dr = await deployProject(connection, {
                    id: data.id,
                    owner: session.userId
                });
                await processResults(dr, logData);
                return { success: true, message: 'Execute successful' };
            } catch (e) {
                await logGit({ application, data: logData, error: e });
                throw e;
            }
        } finally {
            await connection.release();
        }
    });

    application.use(router.routes());
};