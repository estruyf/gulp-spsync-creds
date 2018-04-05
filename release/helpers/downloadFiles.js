"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var sprequest = require("sp-request");
var gutil = require("gulp-util");
var moment = require("moment");
var FileDownload = (function () {
    function FileDownload(options) {
        this.digestVal = null;
        this.config = options;
        this.spr = sprequest.create({ username: options.username, password: options.password });
    }
    FileDownload.prototype.init = function () {
        var _this = this;
        this.started = moment();
        return new Promise(function (resolve, reject) {
            _this.start().then(function (results) {
                resolve(results);
            }).catch(function (err) {
                reject(err);
            });
        });
    };
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
                            if (_this.config.associatedHtml) {
                                resolve(allFiles_1);
                                return;
                            }
                            var proms = [];
                            allFiles_1.forEach(function (file) {
                                if (file.name.indexOf('.js') !== -1 ||
                                    file.name.indexOf('.aspx') !== -1 ||
                                    file.name.indexOf('.master') !== -1) {
                                    proms.push(_this.checkHtmlAssociation(file));
                                }
                            });
                            Promise.all(proms).then(function (data) {
                                if (data !== null) {
                                    data.forEach(function (file) {
                                        if (file !== null) {
                                            if (file.associated) {
                                                allFiles_1 = allFiles_1.filter(function (f) {
                                                    return f.name !== file.name;
                                                });
                                            }
                                        }
                                    });
                                }
                                resolve(allFiles_1);
                            });
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
            }).catch(function (err) {
                reject(err);
            });
        });
    };
    FileDownload.prototype.processFilesAndFolders = function (filesAndFolders, folderName) {
        var _this = this;
        var files = [];
        var crntLoc = typeof folderName === 'undefined' ? "" : folderName + '/';
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
        if (typeof filesAndFolders.Folders !== 'undefined' && filesAndFolders.Folders !== null) {
            if (typeof filesAndFolders.Folders.results !== 'undefined') {
                filesAndFolders.Folders.results.forEach(function (rFolder) {
                    files = files.concat(_this.processFilesAndFolders(rFolder, (crntLoc + rFolder.Name)));
                });
            }
        }
        return files;
    };
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
            var expand = "Files,Folders";
            for (var i = 1; i < 3; i++) {
                expand += "," + Array(i + 1).join("Folders/") + "Files";
            }
            _this.spr.get(_this.config.site + "/_api/web/GetFolderByServerRelativeUrl('" + _this.config.startFolder + "')?$expand=" + expand, {
                headers: headers
            })
                .then(function (data) {
                resolve(data);
            }).catch(function (err) {
                reject(err);
            });
        });
    };
    ;
    FileDownload.prototype.checkHtmlAssociation = function (file) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var headers = {
                "content-type": "application/json;odata=verbose",
                "Accept": "application/json;odata=verbose"
            };
            var restUrl = _this.config.site + "/_api/web/GetFolderByServerRelativeUrl('" + _this.config.startFolder + '/' + file.name + "')/ListItemAllFields?$select=HtmlDesignAssociated";
            _this.spr.get(restUrl, {
                headers: headers
            })
                .then(function (data) {
                if (data.body !== null) {
                    if (typeof data.body.d !== 'undefined') {
                        if (typeof data.body.d.HtmlDesignAssociated !== 'undefined') {
                            if (data.body.d.HtmlDesignAssociated === true) {
                                file.associated = true;
                            }
                            else {
                                file.associated = false;
                            }
                            resolve(file);
                        }
                    }
                }
            })
                .catch(function (err) {
                gutil.log(gutil.colors.red("ERROR: Unable to retrieve metadata of file: ", file.name));
                resolve(null);
            });
        });
    };
    FileDownload.prototype.download = function (file) {
        var _this = this;
        if (this.config.verbose) {
            gutil.log("INFO: Start download of ", file.name);
        }
        return new Promise(function (resolve, reject) {
            if (file.contentUrl !== null) {
                _this.spr.get(file.contentUrl, { encoding: null })
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
