"use strict";
var gutil = require('gulp-util');
var path = require('path');
var FileHelper = (function () {
    function FileHelper() {
    }
    FileHelper.prototype.getFolderPathsArray = function (folder) {
        if (this.endsWith(folder, "/") && folder !== "/") {
            folder = folder.slice(0, -1);
        }
        var folderNamesArray = folder.split('/');
        var foldersArray = [];
        for (var i = 0; i < folderNamesArray.length; i++) {
            var pathArray = [];
            for (var r = 0; r <= i; r++) {
                pathArray.push(folderNamesArray[r]);
            }
            foldersArray.push(pathArray.join('/'));
        }
        return foldersArray;
    };
    FileHelper.prototype.getFileContext = function (config) {
        var ix = config.file.relative.lastIndexOf(path.sep);
        var ix2 = 0;
        if (config.startFolder) {
            ix2 = config.file.relative.indexOf(config.startFolder) + config.startFolder.length + 1;
            if (ix2 == -1) {
                ix2 = 0;
            }
        }
        var library = config.file.relative.substring(ix2, ix);
        if (config.verbose) {
            gutil.log('INFO: Using library: ' + library);
        }
        var filename = config.file.relative.substring(ix + 1);
        return {
            library: library,
            filename: filename
        };
    };
    FileHelper.prototype.endsWith = function (str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    };
    return FileHelper;
}());
exports.FileHelper = FileHelper;
