import * as gutil from 'gulp-util';
import * as path from 'path';
import * as util from 'util';

import {IFileInfo} from './../utils/IFileInfo';
import {ISettings} from './../utils/ISettings';

export class FileHelper {
    public getFolderPathsArray (folder: string) {
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
    }

    public getFileContext(config: ISettings): IFileInfo {
        let ix = config.file.relative.lastIndexOf(path.sep)
        let ix2 = 0;
        if(config.startFolder) {
            ix2 = config.file.relative.indexOf(config.startFolder) + config.startFolder.length + 1
            if(ix2 == -1) {
                ix2 = 0
            }
        }
		var library = config.file.relative.substring(ix2,ix)
        if(config.verbose){
            gutil.log('INFO: Using library: ' + library)	
        }
		var filename = config.file.relative.substring(ix+1)
		return {
			library: config.libraryPath !== "" ? `${config.libraryPath}/${library}` : library,
			filename: filename
		};
    }

    private endsWith (str: string, suffix: string): boolean {
		return str.indexOf(suffix, str.length - suffix.length) !== -1;
	}
}