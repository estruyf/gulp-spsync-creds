process.env.NODE_ENV = 'development';

var sprequest = require('sp-request'),
    gulp = require('gulp'),
    spsync = require('./../src/index').sync,
    url = require('url'),
    fs = require('fs'),
    expect = require('chai').expect;
    Promise = require('bluebird');

var config = {
    username: '<username>',
    password: '<password>',
    site: '<site-url>',
    fileMetadata: [{
        "name": "Item_Minimal.js",
        "metadata": {
            "__metadata": { "type": "SP.Data.OData__x005f_catalogs_x002f_masterpageItem" },
            "Title": "Item Minimal Template (via GULP)",
            "MasterPageDescription": "This is a display template added via gulp.",
            "ManagedPropertyMapping": "'Path','Title':'Title'",
            "ContentTypeId": "0x0101002039C03B61C64EC4A04F5361F38510660500A0383064C59087438E649B7323C95AF6",
            "DisplayTemplateLevel": "Item",
            "TargetControlType": {
                "__metadata": {
                    "type": "Collection(Edm.String)"
                },
                "results": [
                    "SearchResults",
                    "Content Web Parts"
                ]
            }
        }
    }]
};

var fileName = 'Item_Minimal.js';
var folder = '_catalogs/masterpage/gulp-tests';
var fileLoc = `./tests/files/${folder}/displaytemplates/${fileName}`;
var baseLoc = 'tests/files';

function deleteFile(crntSpr, crntDigest, file) {
    return new Promise(function (resolve, reject) {
        crntSpr.post(file, {
            headers: {
                'X-RequestDigest': crntDigest,
                'X-HTTP-Method': 'DELETE'
            }
        })
        .then(function () {
            resolve(null);
        })
        .catch(function () {
            resolve(null);
        })
    });
}
function deleteFolder(crntSpr, crntDigest, fld) {
    return new Promise(function (resolve, reject) {
        crntSpr.post(fld, {
            headers: {
                'X-RequestDigest': crntDigest,
                'X-HTTP-Method': 'DELETE'
            }
        })
        .then(function () {
            resolve(null);
        })
        .catch(function () {
            resolve(null);
        })
    });
}

var path = (url.parse(config.site).path).replace(/(\/$)|(\\$)/, '');
var folderUrl = config.site + "/_api/web/GetFolderByServerRelativeUrl(@FolderName)?@FolderName='" + encodeURIComponent(folder) + "'";
var fileRelativeUrl = `${path}/${folder}/displaytemplates/${fileName}`;
var retrieveFileUrl = `${config.site}/_api/web/GetFileByServerRelativeUrl(@FileUrl)/$value?@FileUrl='${encodeURIComponent(fileRelativeUrl)}'`;
var metadataFileUrl = `${config.site}/_api/web/GetFileByServerRelativeUrl(@FileUrl)/listitemallfields?@FileUrl='${encodeURIComponent(fileRelativeUrl)}'`;
var publishFileUrl = `${config.site}/_api/web/GetFileByServerRelativeUrl(@FileUrl)?@FileUrl='${encodeURIComponent(fileRelativeUrl)}'`;
var deleteFileUrl = `${config.site}/_api/web/GetFileByServerRelativeUrl(@FileUrl)?@FileUrl='${encodeURIComponent(fileRelativeUrl)}'`;

describe('gulp-spsync-creds: file upload tests', function () {
    var spr = sprequest.create({ username: config.username, password: config.password });

    before('delete file and folders', function (done) {
        console.log('Delete file and folders before running tests');
        this.timeout(10 * 1000);      

        spr.requestDigest(config.site)
            .then(digest => {
                return deleteFile(spr, digest, deleteFile)
                .then(function (success) {
                    return deleteFolder(spr, digest, folderUrl);
                })
                .catch(function (err) {
                    return deleteFolder(spr, digest, folderUrl);
                });
            })
            .then(data => {
                done();
            })
            .catch(done);
        }
    );

    beforeEach('delete file', function (done) {
        console.log('Delete file before running next test');
        this.timeout(10 * 1000);      

        spr.requestDigest(config.site)
            .then(digest => {
                return deleteFile(spr, digest, deleteFile);
            })
            .then(data => {
                done();
            })
            .catch(done);
        }
    );

    after('cleaning', function (done) {
        console.log('Clean up file and folders after tests have ran');
        this.timeout(10 * 1000);

        spr.requestDigest(config.site)
            .then(digest => {
                return deleteFile(spr, digest, deleteFile)
                .then(function (success) {
                    return deleteFolder(spr, digest, folderUrl);
                })
                .catch(function (err) {
                    return deleteFolder(spr, digest, folderUrl);
                });
            })
            .then(data => {
                done();
            })
            .catch(done);
        }
    );

    it('File should be uploaded to a folder', function (done) {
        this.timeout(10 * 1000);
        var fileContent = fs.readFileSync(fileLoc);

        gulp.src(fileLoc, { base: baseLoc })
            .pipe(spsync({
                site: config.site,
                username: config.username,
                password: config.password,
                cache: true
            }))
            .on('finish', function () {
                spr.get(retrieveFileUrl, {
                    encoding: null
                })
                .then(data => {
                    expect(fileContent.equals(data.body)).is.true;
                    done();
                })
                .catch(done);
            });
    });

    it('Same as previous but no folder creation', function (done) {
        this.timeout(10 * 1000);
        var fileContent = fs.readFileSync(fileLoc);

        gulp.src(fileLoc, { base: baseLoc })
            .pipe(spsync({
                site: config.site,
                username: config.username,
                password: config.password,
                cache: true
            }))
            .on('finish', function () {
                spr.get(retrieveFileUrl, {
                    encoding: null
                })
                .then(data => {
                    expect(fileContent.equals(data.body)).is.true;
                    done();
                })
                .catch(done);
            });
    });

    it('Upload file and set metadata', function (done) {
        this.timeout(10 * 1000);
        gulp.src(fileLoc, { base: baseLoc })
            .pipe(spsync({
                site: config.site,
                username: config.username,
                password: config.password,
                files_metadata: config.fileMetadata,
                update_metadata: true,
                cache: true
            }))
            .on('finish', function () {
                spr.get(metadataFileUrl, {
                    headers: {
                        "Accept": "application/json; odata=verbose",
                    }
                })
                .then(data => {
                    expect(data.body.d.Title === config.fileMetadata[0].metadata.Title).is.true;
                    expect(data.body.d.MasterPageDescription === config.fileMetadata[0].metadata.MasterPageDescription).is.true;
                    done();
                })
                .catch(done);
            });
    });

    it('File should get published', function (done) {
        this.timeout(10 * 1000);
        gulp.src(fileLoc, { base: baseLoc })
            .pipe(spsync({
                site: config.site,
                username: config.username,
                password: config.password,
                files_metadata: config.fileMetadata,
                publish: true
            }))
            .on('finish', function () {
                spr.get(publishFileUrl, {
                    headers: {
                        "Accept": "application/json; odata=verbose",
                    }
                })
                .then(data => {
                    expect(data.body.d.MajorVersion >= 1 && data.body.d.MinorVersion === 0).is.true;
                    done();
                })
                .catch(done); 
            });
    });
});