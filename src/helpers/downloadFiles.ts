import * as sprequest from 'sp-request';
import * as Promise from 'bluebird';
import * as gutil from 'gulp-util';
import * as path from 'path';
import * as moment from 'moment';

import {IFileInfo, IFileDownload} from './../utils/IFileInfo';
import {ISettings, IDigest} from './../utils/ISettings';

import {defer, IDeferred} from './defer';

export class FileDownload {
    config: ISettings;
    spr: sprequest.ISPRequest;
	fileInfo: IFileInfo;
	started: moment.Moment;
    digestVal: string = null;

    constructor(options: ISettings) {
        this.config = options;
        this.spr = sprequest.create({ username: options.username, password: options.password });
    }

	/*
	 * Initialize file upload
	 */
    public init(): Promise<any> {
		this.started = moment();
		return new Promise<any>((resolve, reject) => {
			this.start().then(results => {
                resolve(results);
            });
		});
    }

    /*
     * Start retrieving all files and folders
     */
    private start(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            var allFiles = [];
            this.getFilesAndFolders().then(filesAndFolders => {
                if (filesAndFolders !== null) {
                    if (typeof filesAndFolders.body !== "undefined" && filesAndFolders.body !== null) {
                        if (typeof filesAndFolders.body.d !== "undefined" && filesAndFolders.body.d !== null) {
                            if (this.config.verbose) {
                                gutil.log("INFO: Processing retrieved files and folders");
                            }
                            let allFiles = this.processFilesAndFolders(filesAndFolders.body.d);

                            // Check if all the files need to get downloaded -> important for display templates
                            if (this.config.associatedHtml) {
                                resolve(allFiles);
                                return;
                            }

                            // Check which files have to be downloaded -> files associated to HTML files do not have to be downloaded
                            var proms = [];
                            allFiles.forEach(file => {
                                if (file.name.indexOf('.js') !== -1 ||
                                    file.name.indexOf('.aspx') !== -1 ||
                                    file.name.indexOf('.master') !== -1) {
                                    proms.push(this.checkHtmlAssociation(file));
                                }
                            });
                            Promise.all(proms).then((data: Array<IFileDownload>) => {
                                if (data !== null) {
                                    data.forEach(file => {
                                        if (file !== null) {
                                            if (file.associated) {
                                                // Filter out the retrieved files that ara associated to an HTML file
                                                allFiles = allFiles.filter(f => {
                                                    return f.name !== file.name;
                                                });
                                            }
                                        }
                                    });
                                }                                
                                resolve(allFiles);
                            });
                        } else {
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            });
        });
    }

    /*
     * Process all retrieved files and folders
     */
    private processFilesAndFolders(filesAndFolders, folderName?: string): Array<IFileDownload> {
        var files = [];
        var crntLoc = typeof folderName === 'undefined' ? "" : folderName + '/';
        // Loop over all the files
        if (typeof filesAndFolders.Files !== 'undefined' && filesAndFolders.Files !== null) {
            if (typeof filesAndFolders.Files.results !== 'undefined') {
                filesAndFolders.Files.results.forEach(rFile => {
                    files.push({
                        name: crntLoc + rFile.Name,
                        path: rFile["__metadata"]["uri"],
                        contentUrl: rFile["__metadata"]["uri"] + '/$value',
                        content: ""
                    })
                });
            }
        }

        // Loop over all the folders
        if (typeof filesAndFolders.Folders !== 'undefined' && filesAndFolders.Folders !== null) {
            if (typeof filesAndFolders.Folders.results !== 'undefined') {
                filesAndFolders.Folders.results.forEach(rFolder => {
                    files = files.concat(this.processFilesAndFolders(rFolder, (crntLoc + rFolder.Name)));
                });
            }
        }

        return files;
    }

    /*
     * Get all files from folder
     */
    private getFilesAndFolders(): Promise<any> {
        if (this.config.verbose) {
            gutil.log("INFO: Start retrieving all files and folders.");
        }
        return new Promise<any>((resolve, reject) => {
            let headers = {
                "content-type":"application/json;odata=verbose",
                "Accept":"application/json;odata=verbose"
            };

            // Maximum of three sub levels
            let expand = "Files,Folders";
            for (var i = 1; i < 3; i++) {
                expand += "," + Array(i + 1).join("Folders/") + "Files";
            }

            // Thanks to Marc D Anderson for the idea: 
            /// http://sympmarc.com/2016/04/23/get-all-sharepoint-document-library-files-and-folders-at-a-serverrelativeurl-in-one-rest-call/
            this.spr.get(
                this.config.site + "/_api/web/GetFolderByServerRelativeUrl('" + this.config.startFolder + "')?$expand=" + expand,
                headers
            )
            .then(data => {
                resolve(data);
            })
            .catch(err => {
                resolve(null);
            });
        });
    };

    /*
     * Check HTML association
     */
    public checkHtmlAssociation(file: IFileDownload): Promise<any> {
        return new Promise((resolve, reject) => {
            let headers = {
                "content-type":"application/json;odata=verbose",
                "Accept":"application/json;odata=verbose"
            };

            let restUrl = this.config.site + "/_api/web/GetFolderByServerRelativeUrl('" + this.config.startFolder + '/' + file.name + "')/ListItemAllFields?$select=HtmlDesignAssociated";
            this.spr.get(
                restUrl,
                headers
            )
            .then(data => {
                if (data.body !== null) {
                    if (typeof data.body.d !== 'undefined') {
                        if (typeof data.body.d.HtmlDesignAssociated !== 'undefined') {
                            if (data.body.d.HtmlDesignAssociated === true) {
                                file.associated = true;
                            } else {
                                file.associated = false;
                            }
                            resolve(file);
                        }
                    }
                }
            })
            .catch(err => {
                gutil.log(gutil.colors.red("ERROR: Unable to retrieve metadata of file: ", file.name));
                resolve(null);
            });
        });
    }

    /*
     * Download the file - get the file content 
     */
    public download(file: IFileDownload): Promise<any> {
        if (this.config.verbose) {
            gutil.log("INFO: Start download of ", file.name);
        }
        return new Promise((resolve, reject) => {
            if (file.contentUrl !== null) {
                this.spr.get(file.contentUrl)
                .then(data => {
                    if (this.config.verbose) {
                        gutil.log(gutil.colors.green("INFO: Download " + file.name + " complete"));
                    }
                    file.content = data.body;
                    resolve(file);
                })
                .catch(err => {
                    gutil.log(gutil.colors.red("ERROR: Downloading " + file.name + " failed"));
                    resolve(null);
                });
            }
        });
    }
}