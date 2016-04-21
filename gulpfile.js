const gulp = require('gulp');
const jasmine = require('gulp-jasmine');
const jasmineBrowser = require('gulp-jasmine-browser');

gulp.task('test', function () {
    gulp.src(['bower_components/angular/angular.js', 'bower_components/angular-mocks/angular-mocks.js', 'vscroll.js', 'test/*.js'])
        .pipe(jasmineBrowser.specRunner({ console: true }))
        .pipe(jasmineBrowser.headless());
});

gulp.task('watch', function() {
    gulp.run('test');
    
    gulp.watch(['vscroll.js', 'test/*.js'], function() {
        gulp.run('test');
    });  
});