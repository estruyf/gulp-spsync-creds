import * as through from 'through2';
import * as gutil from 'gulp-util';
import * as Promise from 'bluebird';

import { ISettings } from './utils/ISettings';
import { IFileDownload } from './utils/IFileInfo';

import { FileSync } from './helpers/fileSyncHelper';
import { FileDownload } from './helpers/downloadFiles';

let PLUGIN_NAME = "gulp-spsync-creds";

export function sync(args: ISettings) {
	let options = GetOptions(args);

	let fileSync = new FileSync(options);

	return through.obj(function (file, enc, cb) {
		var fileDone = function (parameter) {
			cb();
		}

		if (file.isNull()) {
			cb()
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
			gutil.log("And we're done...")
		}
		cb();
	})
}

export function download(args: ISettings) {
	var stream = through.obj(function (file, enc, callback) {
		this.push(file);
		return callback();
	});

	if (typeof args.startFolder !== 'undefined' && args.startFolder !== null) {
		let options = GetOptions(args);
		let fileDownload = new FileDownload(options);
		fileDownload.init().then((files) => {
			if (files === null) {
				gutil.log(gutil.colors.yellow("No files found on the specified startFolder path"));
			} else {
				gutil.log(gutil.colors.green("Retrieved all files from the folder."));

				// Start retrieving the file content
				let proms = [];
				files.forEach(file => {
					proms.push(fileDownload.download(file).then((uFile: IFileDownload) => {
						var vinylFile: any = new gutil.File({
							cwd: "",
							base: "",
							path: uFile.name,
							contents: ((uFile.content instanceof Buffer) ? uFile.content : new Buffer(uFile.content))
						});

						stream.write(vinylFile);
					}));
				});

				Promise.all(proms).then(data => {
					if (options.verbose) {
						gutil.log("And we're done...");
					}
					// End the file stream
					stream.end();
				});
			}
		}).catch(err => {
			if (typeof err.message !== "undefined") {
				gutil.log(gutil.colors.red(`ERROR: ${err.message}`));
			} else {
				gutil.log(gutil.colors.red(`ERROR: ${JSON.stringify(err)}`));
			}
		});
	} else {
		gutil.log(gutil.colors.red("Please specify the startFolder"));
		// End the steam
		stream.end();
	}

	return stream;
}

function GetOptions(args: ISettings) {
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
		cache: false,
		associatedHtml: true,
		libraryPath: ""
	}

	// Check arguments
	if (!args) {
		throw "options required"
	}
	if (!args.username) {
		throw "The username parameter is required"
	}
	if (!args.password) {
		throw "The password parameter is required"
	}
	if (!args.site) {
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
		options.startFolder = args.startFolder || options.startFolder;
		options.associatedHtml = args.associatedHtml || options.associatedHtml;
		options.libraryPath = args.libraryPath || options.libraryPath;
	}

	return options;
}