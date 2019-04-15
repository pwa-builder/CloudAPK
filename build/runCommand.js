const { spawn } = require('child_process');

module.exports = (cmdLineToRun) => {

    return new Promise((resolve, reject) => {

        let result = {
            stderr: "",
            stdout: ""
        }

        const command = spawn(cmdLineToRun, {
            shell: true
        });

        command.stderr.on('data', (stderr) => {
            result.stderr += stderr;
        });

        command.stdout.on('data', (stdout) => {
            result.stdout += stdout;
        });

        command.on('error', (err) => {
            return reject(err);
        });

        command.on("close", () => {
            if (!result.stderr) {
                resolve(result);
            } else {
                reject(result.stderr);
            }
        });

    });

}