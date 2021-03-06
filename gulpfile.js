'use strict';

var async = require('async');
var gulp = require('gulp');
var watch = require('gulp-watch');
var lodash = require('lodash');
var iconfont = require('gulp-iconfont');
var consolidate = require('gulp-consolidate');

var runSequence = require('run-sequence');
var sass = require('gulp-sass');

var rename = require("gulp-rename");
var template = require('gulp-template');
var removeEmptyLines = require('gulp-remove-empty-lines');

var include = require("gulp-include");
var webserver = require('gulp-webserver');
var cleanCSS = require('gulp-clean-css');
var uglify = require('gulp-uglify');
var pump = require('pump');

// Configuration vars
var sharedVars = require('./dev/assets/config');


/*
 * Compile
 * Takes the config vars and creates a JS and Sass variable
 * file using underscore templates
 *
 */
gulp.task('compile', function() {

  // SASS config to template
  gulp.src('./dev/assets/templates/sass-vars.txt')
    .pipe(template(sharedVars))
    .pipe(rename('_vars.scss'))
    .pipe(removeEmptyLines())
    .pipe(gulp.dest('./dev/assets/scss'));

  // Javascript config to template
  gulp.src('./dev/assets/templates/js-vars.txt')
    .pipe(template(sharedVars))
    .pipe(rename('_vars.js'))
    .pipe(removeEmptyLines())
    .pipe(gulp.dest('./dev/assets/js/ninjules/config'));
});


gulp.task('minify-css', function() {
  return gulp.src('./assets/css/*.css')
    .pipe(cleanCSS({compatibility: 'ie9'}))
    .pipe(gulp.dest('./assets/css'));
});

gulp.task('minify-js', function(cb) {
  pump([
      gulp.src('./assets/js/*.js'),
      uglify(),
      gulp.dest('./assets/js')
    ],
    cb
  );
});

gulp.task('minify-all', function() {
  return runSequence('minify-js', 'minify-css');
});



/*
 *  STYLING
 *
 */
gulp.task('style', function () {
  return gulp.src('./dev/assets/scss/**/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('./assets/css'));
});

gulp.task('scripts', function() {
  return gulp.src([
      './dev/assets/js/head-script.js',
      './dev/assets/js/body-script.js',
      './dev/assets/js/passthrough-script.js',
      './dev/assets/js/jsperftests.js'
    ])
    .pipe(include())
    .on('error', console.log)
    .pipe(gulp.dest('./assets/js'));
});

gulp.task('watch', function () {
  gulp.watch('./dev/assets/scss/**/*.scss', ['style']);
  gulp.watch('./dev/assets/js/**/*.js', ['scripts']);
});


/*
 * Twig Template
 *
 */
gulp.task('twig', function () {
  var twig = require('gulp-twig');
  var contentData = require('./dev/assets/twig/contentData');

  return gulp.src('./dev/assets/twig/**.twig')
    .pipe(twig({
      data: contentData
    }))
    .pipe(gulp.dest('./'));
});



/*
 * ICON FONT
 *
 */
gulp.task('Iconfont', function(done){
  var iconStream = gulp.src(['./dev/assets/icons/*.svg'])
        .pipe(iconfont({ fontName: 'pnfont' }));

  async.parallel([
    function handleGlyphs (cb) {
      iconStream.on('glyphs', function(glyphs, options) {
        gulp.src('./dev/assets/templates/_icons.txt')
          .pipe(consolidate('lodash', {
            glyphs: glyphs,
            fontName: 'pnfont',
            fontPath: '../fonts/',
            className: 'if'
          }))
          .pipe(rename("atoms/_icons.scss"))
          .pipe(gulp.dest('./dev/assets/scss/'))
          .on('finish', cb);
      });
    },
    function handleFonts (cb) {
      iconStream
        .pipe(gulp.dest('./assets/fonts/'))
        .on('finish', cb);
    }
  ], done);
});


gulp.task('copy', function () {
  return gulp.src('./dev/assets/images/**/**.*')
    .pipe(gulp.dest('./assets/images'));
});


gulp.task('webserver', function() {
  gulp.src('./')
    .pipe(webserver({
      livereload: true,
      directoryListing: false,
      open: true,
      fallback: 'index.html'
    }));
});


gulp.task('serve', function () {
  // Endless stream mode
  watch('./dev/assets/scss/**/*.scss', { ignoreInitial: false })
    .pipe(function() {
      gulp.start('style');
    });
});

gulp.task('build', function() {
  runSequence('Iconfont');
});

gulp.task('full', function() {
  runSequence('twig', 'compile', 'scripts', 'style', 'copy', 'minify-all');
});

gulp.task('default', function() {
  runSequence('twig', 'compile', 'scripts', 'style', 'copy');
});