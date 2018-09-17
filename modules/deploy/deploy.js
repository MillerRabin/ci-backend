const node_ssh = require('node-ssh');
const response = require('../../middlewares/response.js');

const cwdCommands = ['cd'];

function getCommand(command) {
    const res = { cwd: null, command: null };
    if (command.cwd != null) res.cwd = command.cwd;
    res.command = (command.command != null) ? command.command : command;
    const [cmd, arg] = res.command.split(/\s+/);
    if (cwdCommands.includes(cmd))
        res.cwd = arg;
    return res;
}

async function executeCommands(commands, params) {
    const dres = [];
    if (commands == null)
        return { results: dres, success: false };

    if (!Array.isArray(commands)) throw new response.Error({ message: `Commands must be array at configuration ${params.config.name}`});
    for (let command of commands) {
        const execCommand = getCommand(command);
        const result = await params.ssh.execCommand(execCommand.command, { cwd: params.cwd });
        if ((command == null) || (command == '')) continue;
        dres.push({
            command: command,
            cwd: params.cwd,
            stdout: result.stdout,
            stderr: result.stderr,
            code: result.code
        });
        if (result.code != 0) return { results: dres, success: false };
        if (execCommand.cwd != null) params.cwd = execCommand.cwd;
    }
    return { results: dres, success: true };
}

async function deploy(params) {
    return await executeCommands(params.config.deploy, params)
}

async function testRepository(params) {
    return await executeCommands(params.config.test, params);
}

async function initRepository(params) {
    return await executeCommands(params.config.init, params);
}

async function reload(params) {
    return await executeCommands(params.config.reload, params);
}

exports.start = async (project) => {
    async function ireload() {
        return await reload({ ssh, cwd, project });
    }
    const projectData = project.project_data;
    const res = [];
    if (projectData == null) throw new response.Error({ message: 'project_data is null'});
    if (!Array.isArray(projectData)) throw new response.Error({ message: 'project_data must be array of configurations'});

    for (let config of projectData) {
        const ssh = new node_ssh();
        try {
            if ((config.name == null) || (config.name == '')) throw new response.Error({ message: 'Configuration without name is invalid'});
            if (config.credentials == null) throw new response.Error({ message: `credentials expected for configuration ${ config.name }`});
            await ssh.connect(config.credentials);
            const cwd = config.directory + '/' + project.project_name;
            const tres = await testRepository({ ssh, cwd, config });
            if (tres.success) {
                const dres = await deploy({ ssh, cwd, config });
                res.push({ test: tres, deploy: dres, reload: ireload, name: config.name });
            } else {
                const ires = await initRepository({ ssh, cwd, config });
                res.push({ test: tres, init: ires, reload: ireload, name: config.name });
            }
        } finally {
            ssh.dispose();
        }
    }
    return res;
};