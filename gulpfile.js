var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var tsc = require('gulp-typescript');
var merge = require('merge2');

var tsProject = tsc.createProject("tsconfig.json");

gulp.task('default', function () {
    var tsResult = tsProject.src()
                            .pipe(sourcemaps.init())
                            .pipe(tsProject());
    return tsResult.js.pipe(sourcemaps.write('.'))
                      .pipe(gulp.dest('src'));
});

gulp.task('build', function () {
    return gulp.src(['./src/**/*.ts', './typings/index.d.ts'])
        .pipe(tsc())
        .pipe(gulp.dest('release'));
});

gulp.task('watch', ['default'], function() {
    gulp.watch('src/**/*.ts', ['default']);
});