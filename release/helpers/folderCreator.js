"use strict";
var Promise = require('bluebird');
var gutil = require('gulp-util');
var path = require('path');
var util = require('util');
var defer_1 = require('./defer');
var fileHelper = require('./fileHelper');
var fileHlp = new fileHelper.FileHelper();
var FolderCreator = (function () {
    function FolderCreator(options, crntSpr, crntDigest, crntFileInfo) {
        this.digest = crntDigest;
        this.config = options;
        this.spr = crntSpr;
        this.fileInfo = crntFileInfo;
    }
    /*
     * Check which folders exists and create which doesn't
     */
    FolderCreator.prototype.checkFoldersAndCreateIfNotExist = function () {
        var _this = this;
        var library = this.fileInfo.library;
        if (path.sep == "\\") {
            library = library.replace(/\\/g, "/");
        }
        // Get all folders
        var foldersArray = fileHlp.getFolderPathsArray(library);
        var proms = [];
        foldersArray.forEach(function (val) {
            proms.push(_this.checkFolderExists(val));
        });
        return new Promise(function (resolve, reject) {
            Promise.all(proms).then(function (data) {
                // Get all folder indexes that do not exist
                var erroredIndexes = data.map(function (val, index) {
                    if (val.error) {
                        return index;
                    }
                }).filter(function (x) {
                    return x != undefined;
                });
                // Store folder names to be created
                var pathArray = [];
                erroredIndexes.map(function (index) {
                    pathArray.push(foldersArray[index]);
                });
                // Check if there are folders to be created
                if (pathArray.length > 0) {
                    return _this.createPathRecursive(pathArray).then(function () {
                        resolve(null);
                    }).catch(function (err) {
                        reject(err);
                    });
                }
                else {
                    resolve(null);
                }
            });
        });
    };
    /*
     * Check which folders exists based on the file path
     */
    FolderCreator.prototype.checkFolderExists = function (folderName) {
        var _this = this;
        var getFolderUrl = util.format("/_api/web/GetFolderByServerRelativeUrl(@FolderName)?@FolderName='%s'", encodeURIComponent(folderName));
        var header = {
            headers: {
                "Accept": "application/json;odata=verbose",
                "content-type": "application/json;odata=verbose",
                "X-RequestDigest": this.digest
            },
            json: true
        };
        var endPoint = this.config.site + getFolderUrl;
        if (this.config.verbose) {
            gutil.log("Checking folder exists " + endPoint);
        }
        return new Promise(function (resolve, reject) {
            _this.spr.get(endPoint, header)
                .then(function (success) {
                if (_this.config.verbose) {
                    gutil.log('Folder ' + folderName + ' exists');
                }
                resolve(success);
            })
                .catch(function (err) {
                gutil.log("INFO: Folder '" + folderName + "' doesn't exist and will be created");
                resolve(err);
            });
        });
    };
    /*
     * Create folders based on the file path
     */
    FolderCreator.prototype.createPathRecursive = function (pathArray, deferred) {
        var _this = this;
        if (!deferred) {
            deferred = defer_1.defer();
        }
        // Check if there is a folder that needs to be created
        if (pathArray.length > 0) {
            if (this.config.verbose) {
                gutil.log("Creating path " + pathArray[0]);
            }
            var setFolder = util.format("/_api/web/folders");
            var opts = {
                headers: {
                    "X-RequestDigest": this.digest
                },
                body: {
                    '__metadata': {
                        'type': 'SP.Folder'
                    },
                    'ServerRelativeUrl': "" + pathArray[0]
                }
            };
            // Create new folder				
            this.spr.post(this.config.site + setFolder, opts)
                .then(function (res) {
                return _this.createPathRecursive(pathArray.slice(1, pathArray.length), deferred);
            })
                .catch(function (err) {
                gutil.log("ERR: " + err);
                deferred.reject(err);
            });
        }
        else {
            // No more folders to create
            deferred.resolve(null);
        }
        return deferred.promise;
    };
    return FolderCreator;
}());
exports.FolderCreator = FolderCreator;
