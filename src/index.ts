import * as through from 'through2';
import * as gutil from 'gulp-util';
import * as Promise from 'bluebird';

import {ISettings} from './utils/ISettings';

import {FileSync} from './helpers/fileSyncHelper';

let PLUGIN_NAME = "gulp-spsync-creds";

export function sync (args: ISettings) {
    // Default options
    let options: ISettings = {
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
	}

    // Check arguments
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
	}

	let fileSync = new FileSync(options);

    return through.obj(function(file, enc, cb) {		
		var fileDone = function (parameter) {
			cb(null, file);
		}
		
		if (file.isNull()) {
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

		// Temp store file in options
		options.file = file;
		options.content = file.contents;

		gutil.log('Uploading ' + file.relative);

		fileSync.init().then(fileDone)
	},function(cb){
		if(options.verbose){
			gutil.log("And we're done...")	
		}		
		cb();
	})
}