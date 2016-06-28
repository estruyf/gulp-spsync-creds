process.env.NODE_ENV = 'development';

var sprequest = require('sp-request'),
    gulp = require('gulp'),
    spsync = require('./../src/index').download,
    url = require('url'),
    fs = require('fs'),
    chai = require('chai'),
    expect = require('chai').expect,
    del = require('del');

chai.use(require('chai-fs'));  

var config = {
    username: '<username>',
    password: '<password>',
    site: '<site-url>'
};

var startFolder = '_catalogs/masterpage/_tests';
var path = "./tests/downloads/" + startFolder;

describe('gulp-spsync-creds: download file tests', function () {
    var spr = sprequest.create({ username: config.username, password: config.password });

    after('cleaning', function (done) {
        console.log('Clean up files and folders after tests have ran');
        this.timeout(10 * 1000);
        // Delete directory
        del(['./tests/downloads/**']).then(paths => {
            console.log('Deleted files and folders:\n', paths.join('\n'));
            done();
        });
    });

    it('Files should get downloaded', function (done) {
        this.timeout(60 * 1000);
        spsync({
            site: config.site,
            username: config.username,
            password: config.password,
            startFolder: startFolder,
            verbose: true
        })
        .pipe(gulp.dest(path))
        .on('finish', () => {
            // Check if the directory is not empty
            expect(path).to.be.a.directory().and.not.empty;
            // Check if files contain content
            fs.readdir(path, (err, files) => {
                if (files.length > 0) {
                    files.filter(function (file) {
                        return fs.statSync(path + '/' + file).isFile();
                    }).forEach(file => {
                        var filePath = path + '/' + file;
                        expect(filePath).to.be.a.file().and.not.empty;
                    });
                }
                done();
            });
        });
    });
});