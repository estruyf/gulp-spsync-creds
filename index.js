'use strict'
var through = require('through2');
var sprequest = require('sp-request');
var gutil = require('gulp-util');
var path = require('path');
var util = require("util");

var PLUGIN_NAME = "gulp-spsync-creds";

module.exports = function(args){
	var options = {
		username: null,
		password: null,
		site: "",
		verbose: false,
		update_metadata: false,
		files_metadata: [],
		publish: false
	}
	
	if(!args){
		throw "options required"
	}
	if(!args.username){
		throw "The username parameter is required"
	}
	if(!args.password){
		throw "The password parameter is required"
	}
	if(!args.site){
		throw "The site options parameter is required"
	}
	
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
	}

	var spr = sprequest.create({ username: options.username, password: options.password });
	var digest = null;
	
	var updateFileMetadata = function(file, resolve, reject) {
		if (options.update_metadata) {
			if (options.files_metadata.length <= 0) {
				resolve(true);
			}
			// Get file context
			var fileCtx = getFileContext(file);
			var library = fileCtx.library;
			var filename = fileCtx.filename;
			// Check if the filename is in the array with metadata
			var fileMetadata = options.files_metadata.filter(function (fm) {
				if (fm.name.toLowerCase() === filename.toLowerCase()) {
					return fm;
				}
			});
			// Check if metadata has been retrieved for the file
			if (fileMetadata.length > 0) {
				var metadata = fileMetadata[0].metadata;
				var metadataHeader = {
					headers:{
						"content-type":"application/json;odata=verbose",
						"Accept":"application/json;odata=verbose",
						"X-HTTP-Method": "MERGE",
						"If-Match": "*",
						"X-RequestDigest": digest
					},
					body: metadata
				};
				spr.post(
					options.site + "/_api/web/GetFolderByServerRelativeUrl('" + library +"')/Files('"+filename +"')/listitemallfields",
					metadataHeader
				).then(function(postData) {
					gutil.log(gutil.colors.green('Metadata updated successfully'));
					resolve(postData);
				}).catch(function(err){
					gutil.log(gutil.colors.red("Unable to update metadata of the file"));
					reject(err);
				});
			} else {
				// Nothing to do, no metadata for the file
				resolve(true);
			}
		} else {
			resolve(true);
		}
	}
	
	var publishFile = function (file, resolve, reject) {
		// Get file context
		var fileCtx = getFileContext(file);
		var library = fileCtx.library;
		var filename = fileCtx.filename;
		if (options.publish) {
			var publishHeader = {
				"headers":{
					"content-type":"application/json;odata=verbose",
					"X-RequestDigest": digest
				}
			};
			// First check out the file
			spr.post(
				options.site + "/_api/web/GetFolderByServerRelativeUrl('" + library +"')/Files('"+filename +"')/CheckOut()",
				publishHeader
			).then(function(result){
				// Check in major version
				spr.post(
					options.site + "/_api/web/GetFolderByServerRelativeUrl('" + library +"')/Files('"+filename +"')/CheckIn(comment='Checked in via GULP', checkintype=1)",
					publishHeader
				).then(function (result) {
					gutil.log(gutil.colors.green('Published file'));
					resolve(result);
				})
			}).catch(function(err){
				gutil.log(gutil.colors.red("Unable to publish file"));
				reject(err);
			});
		} else {
			resolve(true);
		}
	}
	
	var getFileContext = function(file) {
		var ix = file.relative.lastIndexOf(path.sep)
        var ix2 = 0;
        if(options.startFolder) {
            ix2 = file.relative.indexOf(options.startFolder) + options.startFolder.length + 1
            if(ix2 == -1) {
                ix2 = 0
            }
        }
		var library = file.relative.substring(ix2,ix)
        if(options.verbose){
            gutil.log('Using library: ' + library)	
        }
		var filename = file.relative.substring(ix+1)
		return {
			library: library,
			filename: filename
		};
	}
	
	var uploadFile = function(file, content){
		var headers = {
			"headers":{
				"X-RequestDigest": digest
			},
			"body": content,
			"json": false
		};
		
		var fileCtx = getFileContext(file);
		var library = fileCtx.library;
		var filename = fileCtx.filename;
		
		if(path.sep == "\\"){
			library = library.replace(/\\/g, "/")
		}
		
		return checkFoldersAndCreateIfNotExist(library, filename, options).then(function() {
			return new Promise(function (resolve, reject) {
				spr.post(
					options.site + "/_api/web/GetFolderByServerRelativeUrl('" + library +"')/Files/add(url='" + filename + "',overwrite=true)",
					headers
				)
				.then(function(success) {
					gutil.log(gutil.colors.green('Upload successful'));
					resolve(success);
				})
				.catch(function(err){
					switch(err.statusCode){
						case 423:
							gutil.log(gutil.colors.red("Unable to upload file, it might be checked out to someone"))
							break;
						default:
							gutil.log(gutil.colors.red("Unable to upload file, it might be checked out to someone"))
							break;
					}
					reject(err);
				});
			});
		}).then(function() {
			// Update file metadata
			return new Promise(function (resolve, reject) {
				updateFileMetadata(file, resolve, reject);
			});
		}).then(function(){
			// Publish file
			return new Promise(function (resolve, reject) {
				publishFile(file, resolve, reject)
			});
		});
	}
	
	var checkFoldersAndCreateIfNotExist = function(library, filename, options) {
		var foldersArray = getFolderPathsArray(library);
		var proms = [];
		foldersArray.forEach(function (val, index) {
			proms.push(checkFolderExists(val));
		});
		
		return Promise.all(proms)
			.then(function(data) {
				var erroredIndexes = data.map(function (val, index) {
					if (val.error) {
						return index;
					}
				}).filter(function (x) { return x != undefined });
				var pathArray = [];
				erroredIndexes.forEach(function (val, index) {
					var path = foldersArray[val];
					pathArray.push(path);
				})
				if (pathArray.length > 0) {
					return createPathRecursive(pathArray, library, filename, options);
				}
			}
		);
	}
	
	var checkFolderExists = function(folderName) {
		var getFolderUrl = util.format("/_api/web/GetFolderByServerRelativeUrl(@FolderName)" + "?@FolderName='%s'", encodeURIComponent(folderName));
        var opts = {
			headers: {
				"Accept": "application/json;odata=verbose",
                "content-type":"application/json;odata=verbose",
				"X-RequestDigest": digest
			},
			json: true
		};
		var endPoint = options.site + getFolderUrl;
		if(options.verbose){
			gutil.log("Checking folder exists " + endPoint);
		}
		return spr.get(endPoint, opts)
			.then(function (success) {
				if(options.verbose){
					gutil.log('Folder ' + folderName + ' exists');
				}
				return success;
			})
			.catch(function(err) {
				gutil.log("INFO: Folder '" + folderName + "' doesn't exist and will be created");
				return err;
			});
	}
	
	var createPathRecursive = function(path, library, filename, options) {
		if(options.verbose){
			gutil.log("Creating path " + path[0]);
		}
		var setFolder = util.format("/_api/web/folders");
		var body = {
			'__metadata': {
				'type': 'SP.Folder'
			},
			'ServerRelativeUrl': "" + path[0]
		};
		var opts = {
			headers: {
				"X-RequestDigest": digest
			},
			body: body
		};
				  
		return new Promise(function (resolve) {
			spr.post(options.site + setFolder, opts)
			.then(function (res) {
				resolve(path.slice(1, path.length));
			})
			.catch(function(err) {
				gutil.log("ERR: " + err);
				return err;
			});
		})
		.then(function (path) {
			if (path.length > 0) {
				return createPathRecursive(path, library, filename, options);
			}
			return true;
		});		
	}
	
	var getFolderPathsArray = function (folder) {
		if (endsWith(folder, "/") && folder !== "/") {
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
	}

	var endsWith = function(str, suffix) {
		return str.indexOf(suffix, str.length - suffix.length) !== -1;
	}

	return through.obj(function(file, enc, cb){		
		var fileDone = function(parameter) {
			cb(null,file)
		}
		
		if(file.isNull()){
			cb(null, file)
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

		gutil.log('Uploading ' + file.relative)

		if (digest === null) {
			spr.requestDigest(options.site).then(function (result) {
				digest = result;
				return uploadFile(file, content).then(fileDone);
			});
		} else {
			return uploadFile(file, content).then(fileDone);
		}

	},function(cb){
		if(options.verbose){
			gutil.log("And we're done...")	
		}		
		cb();
	})
}