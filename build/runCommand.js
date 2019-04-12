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
            if(stderr == null) {
            resolve(result);
            }
        });

    });

}