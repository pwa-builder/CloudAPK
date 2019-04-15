const { tmpdir } = require("os");

module.exports = {
    UPLOAD_DIRECTORY: "/uploads",
    UNZIP_PATH: tmpdir()
}