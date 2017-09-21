"use strict";
var sprequest = require("sp-request");
var Promise = require("bluebird");
var gutil = require("gulp-util");
var moment = require("moment");
var defer_1 = require("./defer");
var folderCreator_1 = require("./folderCreator");
var fileHelper = require("./fileHelper");
var fileHlp = new fileHelper.FileHelper();
var digestVal = {
    digest: null,
    retrieved: null,
    url: ""
};
var forceCheckoutValue = false; // Default master page gallery setting
var docLibChecked = false;
var FileSync = (function () {
    function FileSync(options) {
        this.config = options;
        this.spr = sprequest.create({ username: options.username, password: options.password });
    }
    /*
     * Initialize file upload
     */
    FileSync.prototype.init = function () {
        var _this = this;
        this.started = moment();
        return new Promise(function (resolve, reject) {
            if (!_this.CheckDigestLifespan() || _this.config.site !== digestVal.url) {
                _this.spr.requestDigest(_this.config.site).then(function (result) {
                    // Store digest
                    digestVal.digest = result;
                    digestVal.retrieved = moment();
                    digestVal.url = _this.config.site;
                    if (_this.config.verbose) {
                        gutil.log('INFO: New digest received');
                    }
                    _this.start().then(function () {
                        resolve(null);
                    })["catch"](function (error) {
                        if (typeof error === "string") {
                            gutil.log(gutil.colors.red("ERROR: " + error));
                        }
                        else {
                            gutil.log(gutil.colors.red('ERROR:'), JSON.stringify(error));
                        }
                        resolve(null);
                    });
                });
            }
            else {
                if (_this.config.verbose) {
                    gutil.log('INFO: Use cached digest value');
                }
                _this.start().then(function () {
                    resolve(null);
                })["catch"](function (error) {
                    if (typeof error === "string") {
                        gutil.log(gutil.colors.red("ERROR: " + error));
                    }
                    else {
                        gutil.log(gutil.colors.red('ERROR:'), JSON.stringify(error));
                    }
                    resolve(null);
                });
            }
        });
    };
    /*
     * Check the lifespan of the digest value
     */
    FileSync.prototype.CheckDigestLifespan = function () {
        if (digestVal.digest !== null && digestVal.retrieved !== null) {
            var now = moment();
            // Use the cached digest value (expires by default after 30 minutes)
            if (now.diff(digestVal.retrieved, 'minutes') < 25) {
                return true;
            }
        }
        return false;
    };
    /*
     * Start uploading a file
     */
    FileSync.prototype.start = function () {
        var _this = this;
        // Get the file info
        this.fileInfo = fileHlp.getFileContext(this.config);
        this.folderCreator = new folderCreator_1.FolderCreator(this.config, this.spr, digestVal.digest, this.fileInfo);
        return new Promise(function (resolve, reject) {
            // Check the library settings - this will only be done the first time
            _this.checkLibrarySettings().then(function () {
                // Create the required folders
                return _this.folderCreator.checkFoldersAndCreateIfNotExist()
                    .then(function () {
                    // Ready to upload file
                    return _this.upload();
                })
                    .then(function () {
                    _this.started = moment();
                    // Ready to set metadata to file
                    return _this.updateFileMetadata();
                })
                    .then(function () {
                    _this.started = moment();
                    // Ready to publish file
                    return _this.publishFile();
                })
                    .then(function () {
                    // Everything done
                    resolve(null);
                })["catch"](function (err) {
                    reject(err);
                });
            });
        });
    };
    /*
     * Check the document libary checkout setting
     */
    FileSync.prototype.checkLibrarySettings = function () {
        var _this = this;
        var headers = {
            "headers": {
                "X-RequestDigest": digestVal.digest,
                "content-type": "application/json;odata=verbose",
                "Accept": "application/json;odata=verbose"
            }
        };
        return new Promise(function (resolve, reject) {
            if (!docLibChecked) {
                var libSettingsUrl = _this.config.site + "/_api/Web/GetCatalog(116)?$select=forceCheckoutValue";
                if (_this.fileInfo.library.indexOf('_catalogs/masterpage') !== 0) {
                    libSettingsUrl = _this.config.site + "/_api/web/GetFolderByServerRelativeUrl('" + _this.fileInfo.library + "')/Properties";
                }
                _this.spr.get(libSettingsUrl, headers).then(function (listInfo) {
                    docLibChecked = true;
                    if (listInfo !== null && (typeof listInfo.body.d.ForceCheckout !== "undefined" || listInfo.body.d.vti_x005f_listrequirecheckout !== "undefined")) {
                        if (_this.config.verbose) {
                            gutil.log('INFO: ForceCheckout value of the document libary is set to:', (listInfo.body.d.ForceCheckout || listInfo.body.d.vti_x005f_listrequirecheckout));
                        }
                        forceCheckoutValue = (listInfo.body.d.ForceCheckout || listInfo.body.d.vti_x005f_listrequirecheckout);
                        resolve(forceCheckoutValue);
                    }
                    else {
                        resolve(forceCheckoutValue);
                    }
                })["catch"](function (err) {
                    docLibChecked = true;
                    resolve(forceCheckoutValue);
                });
            }
            else {
                // Document library already checked
                resolve(forceCheckoutValue);
            }
        });
    };
    /*
     * Upload file
     */
    FileSync.prototype.upload = function () {
        var _this = this;
        var headers = {
            "headers": {
                "X-RequestDigest": digestVal.digest
            },
            "body": this.config.content,
            "json": false
        };
        return new Promise(function (resolve, reject) {
            _this.checkoutBeforeUpload().then(function () {
                return _this.spr.post(_this.config.site + "/_api/web/GetFolderByServerRelativeUrl('" + _this.fileInfo.library + "')/Files/add(url='" + _this.fileInfo.filename + "',overwrite=true)", headers)
                    .then(function (success) {
                    gutil.log(gutil.colors.green('Upload successful'), gutil.colors.magenta(moment().diff(_this.started, 'milliseconds').toString() + 'ms'));
                    resolve(success);
                })["catch"](function (err) {
                    gutil.log(gutil.colors.red("Unable to upload file, it might be checked out to someone"));
                    reject(err);
                });
            });
        });
    };
    /*
     * Check if a file needs to be checked out before you can do a new upload
     */
    FileSync.prototype.checkoutBeforeUpload = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (forceCheckoutValue) {
                return _this.checkout().then(function () {
                    if (_this.config.verbose) {
                        gutil.log("INFO: File " + _this.fileInfo.filename + " is now checked out and ready for new upload");
                    }
                    resolve(null);
                })["catch"](function () {
                    resolve(null);
                });
            }
            else {
                resolve(null);
            }
        });
    };
    /*
     * Update file metadata
     */
    FileSync.prototype.updateFileMetadata = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            // Check if the file metadata has to be updated
            if (_this.config.update_metadata) {
                // Check if the config consists file metadata
                if (_this.config.files_metadata.length <= 0) {
                    resolve(null);
                }
                // Check if file metadata exists for the current file
                var fileMetadata = _this.config.files_metadata.filter(function (fm) {
                    if (fm.name.toLowerCase() === _this.fileInfo.filename.toLowerCase()) {
                        return fm;
                    }
                });
                if (fileMetadata.length > 0) {
                    // Get the first metadata config for of the current file
                    var metadata = fileMetadata[0].metadata;
                    var header = {
                        headers: {
                            "content-type": "application/json;odata=verbose",
                            "Accept": "application/json;odata=verbose",
                            "X-HTTP-Method": "MERGE",
                            "If-Match": "*",
                            "X-RequestDigest": digestVal.digest
                        },
                        body: metadata
                    };
                    _this.spr.post(_this.config.site + "/_api/web/GetFolderByServerRelativeUrl('" + _this.fileInfo.library + "')/Files('" + _this.fileInfo.filename + "')/listitemallfields", header).then(function (postData) {
                        gutil.log(gutil.colors.green('Metadata updated successfully'), gutil.colors.magenta(moment().diff(_this.started, 'milliseconds').toString() + 'ms'));
                        resolve(postData);
                    })["catch"](function (err) {
                        gutil.log(gutil.colors.red("Unable to update metadata of the file"));
                        reject(err);
                    });
                }
                else {
                    // Nothing to do, no metadata for the file
                    resolve(null);
                }
            }
            else {
                // Metadata must not be set
                resolve(null);
            }
        });
    };
    /*
     * Publish the file
     */
    FileSync.prototype.publishFile = function () {
        var _this = this;
        var deferred = defer_1.defer();
        // Check if the file needs to be published
        if (this.config.publish) {
            // First check out the file
            return this.checkout().then(function () {
                // Major checkin file
                return _this.checkin(deferred, 1);
            })["catch"](function (err) {
                gutil.log(gutil.colors.red("Unable to publish file"));
                deferred.reject(err);
            });
        }
        else {
            // File must not be published
            deferred.resolve(null);
        }
        return deferred.promise;
    };
    /*
     * Check the file checkouttype
     */
    FileSync.prototype.checkouttype = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var header = {
                "headers": {
                    "content-type": "application/json;odata=verbose",
                    "X-RequestDigest": digestVal.digest
                }
            };
            _this.spr.post(_this.config.site + "/_api/web/GetFolderByServerRelativeUrl('" + _this.fileInfo.library + "')/Files('" + _this.fileInfo.filename + "')/checkOutType", header)
                .then(function (success) {
                resolve(success);
            })["catch"](function (err) {
                reject(err);
            });
        });
    };
    /*
     * Check out file
     */
    FileSync.prototype.checkout = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.config.verbose) {
                gutil.log("INFO: Checking if file (" + _this.fileInfo.filename + ") is checked out");
            }
            // Retrieve the file its checkout type
            _this.checkouttype()
                .then(function (data) {
                if (typeof data.body === "undefined" || typeof data.body.d === "undefined" || typeof data.body.d.CheckOutType === "undefined") {
                    // Try publishing the file
                    resolve(data);
                }
                if (_this.config.verbose) {
                    gutil.log('INFO: File checkout type:', data.body.d.CheckOutType);
                }
                // Check if the file checkout type is not 0 (checked out)
                if (data.body.d.CheckOutType !== 0) {
                    // File needs to be checked out before publish
                    var header = {
                        "headers": {
                            "content-type": "application/json;odata=verbose",
                            "X-RequestDigest": digestVal.digest
                        }
                    };
                    return _this.spr.post(_this.config.site + "/_api/web/GetFolderByServerRelativeUrl('" + _this.fileInfo.library + "')/Files('" + _this.fileInfo.filename + "')/CheckOut()", header)
                        .then(function (success) {
                        if (_this.config.verbose) {
                            gutil.log('INFO: File is now checked out and ready to be published');
                        }
                        resolve(success);
                    })["catch"](function (err) {
                        reject(err);
                    });
                }
                else {
                    // File already checked out
                    resolve(data);
                }
            })["catch"](function (err) {
                reject(err);
            });
        });
    };
    /*
     * Check in file - Minor: 0 - Major: 1 - Overwrite: 2
     */
    FileSync.prototype.checkin = function (deferred, type) {
        var _this = this;
        // Check if there was a checkin type specified
        if (!type) {
            // MinorCheckIn = 0
            type = 0;
        }
        var header = {
            "headers": {
                "content-type": "application/json;odata=verbose",
                "X-RequestDigest": digestVal.digest
            }
        };
        this.spr.post(this.config.site + "/_api/web/GetFolderByServerRelativeUrl('" + this.fileInfo.library + "')/Files('" + this.fileInfo.filename + "')/CheckIn(comment='Checked in via GULP', checkintype=" + type + ")", header).then(function (result) {
            gutil.log(gutil.colors.green('Published file'), gutil.colors.magenta(moment().diff(_this.started, 'milliseconds').toString() + 'ms'));
            deferred.resolve(result);
        });
        return deferred.promise;
    };
    return FileSync;
}());
exports.FileSync = FileSync;
