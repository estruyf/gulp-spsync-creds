"use strict";
var sprequest = require('sp-request');
var Promise = require('bluebird');
var gutil = require('gulp-util');
var moment = require('moment');
var FileDownload = (function () {
    function FileDownload(options) {
        this.digestVal = null;
        this.config = options;
        this.spr = sprequest.create({ username: options.username, password: options.password });
    }
    /*
     * Initialize file upload
     */
    FileDownload.prototype.init = function () {
        var _this = this;
        this.started = moment();
        return new Promise(function (resolve, reject) {
            _this.start().then(function (results) {
                resolve(results);
            });
        });
    };
    /*
     * Start retrieving all files and folders
     */
    FileDownload.prototype.start = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var allFiles = [];
            _this.getFilesAndFolders().then(function (filesAndFolders) {
                if (filesAndFolders !== null) {
                    if (typeof filesAndFolders.body !== "undefined" && filesAndFolders.body !== null) {
                        if (typeof filesAndFolders.body.d !== "undefined" && filesAndFolders.body.d !== null) {
                            if (_this.config.verbose) {
                                gutil.log("INFO: Processing retrieved files and folders");
                            }
                            var allFiles_1 = _this.processFilesAndFolders(filesAndFolders.body.d);
                            resolve(allFiles_1);
                        }
                        else {
                            resolve(null);
                        }
                    }
                    else {
                        resolve(null);
                    }
                }
                else {
                    resolve(null);
                }
            });
        });
    };
    /*
     * Process all retrieved files and folders
     */
    FileDownload.prototype.processFilesAndFolders = function (filesAndFolders, folderName) {
        var _this = this;
        var files = [];
        var crntLoc = typeof folderName === 'undefined' ? "" : folderName + '/';
        // Loop over all the files
        if (typeof filesAndFolders.Files !== 'undefined' && filesAndFolders.Files !== null) {
            if (typeof filesAndFolders.Files.results !== 'undefined') {
                filesAndFolders.Files.results.forEach(function (rFile) {
                    files.push({
                        name: crntLoc + rFile.Name,
                        path: rFile["__metadata"]["uri"],
                        contentUrl: rFile["__metadata"]["uri"] + '/$value',
                        content: ""
                    });
                });
            }
        }
        // Loop over all the folders
        if (typeof filesAndFolders.Folders !== 'undefined' && filesAndFolders.Folders !== null) {
            if (typeof filesAndFolders.Folders.results !== 'undefined') {
                filesAndFolders.Folders.results.forEach(function (rFolder) {
                    files = files.concat(_this.processFilesAndFolders(rFolder, (crntLoc + rFolder.Name)));
                });
            }
        }
        return files;
    };
    /*
     * Get all files from folder
     */
    FileDownload.prototype.getFilesAndFolders = function () {
        var _this = this;
        if (this.config.verbose) {
            gutil.log("INFO: Start retrieving all files and folders.");
        }
        return new Promise(function (resolve, reject) {
            var headers = {
                "content-type": "application/json;odata=verbose",
                "Accept": "application/json;odata=verbose"
            };
            // Maximum of three sub levels
            var expand = "Files,Folders";
            for (var i = 1; i < 3; i++) {
                expand += "," + Array(i + 1).join("Folders/") + "Files";
            }
            // Thanks to Marc D Anderson for the idea: 
            /// http://sympmarc.com/2016/04/23/get-all-sharepoint-document-library-files-and-folders-at-a-serverrelativeurl-in-one-rest-call/
            _this.spr.get(_this.config.site + "/_api/web/GetFolderByServerRelativeUrl('" + _this.config.startFolder + "')?$expand=" + expand, headers)
                .then(function (data) {
                resolve(data);
            })
                .catch(function (err) {
                gutil.log(gutil.colors.red("ERROR: Unable to get the download location"));
                resolve(null);
            });
        });
    };
    ;
    /*
     * Download the file - get the file content
     */
    FileDownload.prototype.download = function (file) {
        var _this = this;
        if (this.config.verbose) {
            gutil.log("INFO: Start download of ", file.name);
        }
        return new Promise(function (resolve, reject) {
            if (file.contentUrl !== null) {
                _this.spr.get(file.contentUrl)
                    .then(function (data) {
                    if (_this.config.verbose) {
                        gutil.log(gutil.colors.green("INFO: Download " + file.name + " complete"));
                    }
                    file.content = data.body;
                    resolve(file);
                })
                    .catch(function (err) {
                    gutil.log(gutil.colors.red("ERROR: Downloading " + file.name + " failed"));
                    resolve(null);
                });
            }
        });
    };
    return FileDownload;
}());
exports.FileDownload = FileDownload;
