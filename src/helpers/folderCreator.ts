import * as sprequest from 'sp-request';
import * as Promise from 'bluebird';
import * as gutil from 'gulp-util';
import * as path from 'path';
import * as util from 'util';

import {IFileInfo} from './../utils/IFileInfo';
import {ISettings} from './../utils/ISettings';
import {defer, IDeferred} from './defer';

import * as fileHelper from './fileHelper';
let fileHlp = new fileHelper.FileHelper();

export class FolderCreator {
    digest: string;
    config: ISettings;
    spr: sprequest.ISPRequest;
	fileInfo: IFileInfo;

    constructor(options: ISettings, crntSpr: sprequest.ISPRequest, crntDigest:string, crntFileInfo: IFileInfo) {
        this.digest = crntDigest;
        this.config = options;
        this.spr = crntSpr;
		this.fileInfo = crntFileInfo;
    }

	/*
	 * Check which folders exists and create which doesn't
	 */
    checkFoldersAndCreateIfNotExist() {
		let library = this.fileInfo.library;
		
		if(path.sep == "\\"){
			library = library.replace(/\\/g, "/")
		}

        // Get all folders
        let foldersArray: string[] = fileHlp.getFolderPathsArray(library);
		let proms = [];
		foldersArray.forEach(val => {
			proms.push(this.checkFolderExists(val));
		});
        return new Promise<any>((resolve, reject) => {
            Promise.all(proms).then(data => {
				// Get all folder indexes that do not exist
                var erroredIndexes = data.map((val, index) => {
					if (val.error) {
						return index;
					}
				}).filter(x => { 
					return x != undefined 
				});
				// Store folder names to be created
				var pathArray: string[] = [];
				erroredIndexes.map(index => {
					pathArray.push(foldersArray[index])
				});
				
				// Check if there are folders to be created
				if (pathArray.length > 0) {
					return this.createPathRecursive(pathArray).then(() => {
						resolve(null);
					}).catch(err => {
						reject(err);
					});
				} else {
					resolve(null);
				}
            });
        });
    }

	/*
	 * Check which folders exists based on the file path
	 */
    checkFolderExists (folderName) {
		let getFolderUrl = util.format("/_api/web/GetFolderByServerRelativeUrl(@FolderName)?@FolderName='%s'", encodeURIComponent(folderName));
        let header = {
			headers: {
				"Accept": "application/json;odata=verbose",
                "content-type":"application/json;odata=verbose",
				"X-RequestDigest": this.digest
			},
			json: true
		};
		let endPoint = this.config.site + getFolderUrl;
		if(this.config.verbose){
			gutil.log("Checking folder exists " + endPoint);
		}

        return new Promise<any>((resolve, reject) => {
			this.spr.get(endPoint, header)
                .then(success => {
                    if(this.config.verbose){
                        gutil.log('Folder ' + folderName + ' exists');
                    }
                    resolve(success);
                })
			    .catch(err => {
                    gutil.log("INFO: Folder '" + folderName + "' doesn't exist and will be created");
                    resolve(err);
                }
            );
		});
	}

	/*
	 * Create folders based on the file path
	 */
    createPathRecursive(pathArray: string[], deferred?: IDeferred<any>): Promise<any> {
		if (!deferred) {
			deferred = defer();
		}
		
		// Check if there is a folder that needs to be created
		if (pathArray.length > 0) {
			if(this.config.verbose){
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
				.then(res => {
					return this.createPathRecursive(pathArray.slice(1, pathArray.length), deferred);
				})
				.catch(err => {
					gutil.log("ERR: " + err);
					deferred.reject(err);
				});
		} else {
			// No more folders to create
			deferred.resolve(null);
		}

		return deferred.promise;
    }
}