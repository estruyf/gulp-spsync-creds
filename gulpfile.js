var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var ts = require('gulp-typescript');
var merge = require('merge2');

var tsconfig = require('./tsconfig.json');

gulp.task('default', function () {
    return gulp.src(['./src/**/*.ts', './typings/index.d.ts'])
        .pipe(sourcemaps.init())
        .pipe(ts())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('src'));
});

gulp.task('build', function () {
    return gulp.src(['./src/**/*.ts', './typings/index.d.ts'])
        .pipe(ts())
        .pipe(gulp.dest('release'));
});

gulp.task('watch', ['default'], function() {
    gulp.watch('src/**/*.ts', ['default']);
});