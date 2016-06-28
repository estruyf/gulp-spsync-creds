"use strict";
var through = require('through2');
var gutil = require('gulp-util');
var Promise = require('bluebird');
var fileSyncHelper_1 = require('./helpers/fileSyncHelper');
var downloadFiles_1 = require('./helpers/downloadFiles');
var PLUGIN_NAME = "gulp-spsync-creds";
function sync(args) {
    var options = GetOptions(args);
    var fileSync = new fileSyncHelper_1.FileSync(options);
    return through.obj(function (file, enc, cb) {
        var fileDone = function (parameter) {
            cb(null, file);
        };
        if (file.isNull()) {
            cb(null, file);
            return;
        }
        if (file.isStream()) {
            cb(new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'));
            return;
        }
        var content = file.contents;
        if (file.contents == null || file.contents.length === 0) {
            content = '';
        }
        // Temp store file in options
        options.file = file;
        options.content = file.contents;
        gutil.log('Uploading ' + file.relative);
        fileSync.init().then(fileDone);
    }, function (cb) {
        if (options.verbose) {
            gutil.log("And we're done...");
        }
        cb();
    });
}
exports.sync = sync;
function download(args) {
    var stream = through.obj(function (file, enc, callback) {
        this.push(file);
        return callback();
    });
    if (typeof args.startFolder !== 'undefined' && args.startFolder !== null) {
        var options_1 = GetOptions(args);
        var fileDownload_1 = new downloadFiles_1.FileDownload(options_1);
        fileDownload_1.init().then(function (files) {
            if (files === null) {
                gutil.log(gutil.colors.yellow("No files found on the specified startFolder path"));
            }
            else {
                gutil.log(gutil.colors.green("Retrieved all files from the folder."));
                // Start retrieving the file content
                var proms_1 = [];
                files.forEach(function (file) {
                    proms_1.push(fileDownload_1.download(file).then(function (uFile) {
                        var vinylFile = new gutil.File({
                            cwd: "",
                            base: "",
                            path: uFile.name,
                            contents: ((uFile.content instanceof Buffer) ? uFile.content : new Buffer(uFile.content))
                        });
                        stream.write(vinylFile);
                    }));
                });
                Promise.all(proms_1).then(function (data) {
                    if (options_1.verbose) {
                        gutil.log("And we're done...");
                    }
                    // End the file stream
                    stream.end();
                });
            }
        });
    }
    else {
        gutil.log(gutil.colors.red("Please specify the startFolder"));
        // End the steam
        stream.end();
    }
    return stream;
}
exports.download = download;
function GetOptions(args) {
    // Default options
    var options = {
        username: null,
        password: null,
        site: "",
        startFolder: "",
        verbose: false,
        update_metadata: false,
        files_metadata: [],
        publish: false,
        file: null,
        content: null,
        cache: false
    };
    // Check arguments
    if (!args) {
        throw "options required";
    }
    if (!args.username) {
        throw "The username parameter is required";
    }
    if (!args.password) {
        throw "The password parameter is required";
    }
    if (!args.site) {
        throw "The site options parameter is required";
    }
    // Merge arguments with the default options
    if (args) {
        // Required properties
        options.username = args.username;
        options.password = args.password;
        options.site = args.site;
        // Default properties or configured via the gulp script
        options.verbose = args.verbose || options.verbose;
        options.update_metadata = args.update_metadata || options.update_metadata;
        options.files_metadata = args.files_metadata || options.files_metadata;
        options.publish = args.publish || options.publish;
        options.cache = args.cache || options.cache;
        options.startFolder = args.startFolder || options.startFolder;
    }
    return options;
}
