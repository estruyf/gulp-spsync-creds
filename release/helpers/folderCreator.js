"use strict";
var Promise = require('bluebird');
var gutil = require('gulp-util');
var path = require('path');
var util = require('util');
var defer_1 = require('./defer');
var fileHelper = require('./fileHelper');
var fileHlp = new fileHelper.FileHelper();
var processedLibs = [];
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
        return new Promise(function (resolve, reject) {
            var library = _this.fileInfo.library;
            // Convert library location to URL path
            if (path.sep == "\\") {
                library = library.replace(/\\/g, "/");
            }
            // Cache checks
            if (_this.config.cache) {
                if (_this.checkCachedLocation(library)) {
                    if (_this.config.verbose) {
                        gutil.log('INFO: Library already processed', library);
                    }
                    resolve(null);
                    return;
                }
            }
            // Get all folders
            var foldersArray = fileHlp.getFolderPathsArray(library);
            var proms = [];
            foldersArray.forEach(function (val) {
                proms.push(_this.checkFolderExists(val));
            });
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
     * Cache library locations
     */
    FolderCreator.prototype.cacheLocation = function (folderLocation) {
        if (this.config.cache) {
            if (processedLibs.indexOf(folderLocation) === -1) {
                processedLibs.push(folderLocation);
            }
        }
    };
    FolderCreator.prototype.checkCachedLocation = function (folderLocation) {
        if (processedLibs.indexOf(folderLocation) !== -1) {
            return true;
        }
        return false;
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
            gutil.log("INFO: Checking folder exists " + endPoint);
        }
        return new Promise(function (resolve, reject) {
            _this.spr.get(endPoint, header)
                .then(function (success) {
                if (_this.config.verbose) {
                    gutil.log('INFO: Folder ' + folderName + ' exists');
                }
                // Temp cache the processed folder
                _this.cacheLocation(folderName);
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
                gutil.log("INFO: Creating path " + pathArray[0]);
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
                // Temp cache the processed folder
                _this.cacheLocation(pathArray[0]);
                if (_this.config.verbose) {
                    gutil.log('INFO: Folder created:', pathArray[0]);
                }
                return _this.createPathRecursive(pathArray.slice(1, pathArray.length), deferred);
            })
                .catch(function (err) {
                gutil.log(gutil.colors.red("ERROR: " + err));
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
