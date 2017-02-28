var gulp = require('gulp'),
  autoprefixer = require('gulp-autoprefixer'),
  minify = require('gulp-minify-css'),
  plumber = require('gulp-plumber'),
  sourcemaps = require('gulp-sourcemaps'),
  sass = require('gulp-sass'),
  globCss = require('gulp-css-globbing'),
  combineMq = require('gulp-combine-mq'),
  gulpif  = require('gulp-if'),
  watch = require('gulp-watch'),
  gutil = require('gulp-util');


/* ***** Gulp Tasks ***** */

/***
---------------------------------------------------------
// Compile CSS, apply prefixer and sourcemaps if set to dev
---------------------------------------------------------  */
gulp.task('scss', function() {
  gutil.log(gutil.colors.bgGreen('   ..::: SCSS TASKS :::...   '));

  return gulp.src('./app/sass/*.scss')
  .pipe(globCss({
    extensions: ['.css', '.scss'],
    autoReplaceBlock: {
      onOff: false,
      globBlockBegin: 'cssGlobbingBegin',
      globBlockEnd: 'cssGlobbingEnd',
      globBlockContents: '../**/*.scss'
    }
  }))
  .pipe(plumber())

  .pipe(sourcemaps.init())

  .pipe(sass().on('error', sass.logError))
  .pipe(autoprefixer({
    browsers: ['last 2 versions'],
    cascade: true
  }))
  .pipe(combineMq({ beautify: false }))
  .pipe(sourcemaps.write())
  // .pipe(minify())
  .pipe(gulp.dest('./app/css'));
});

gulp.task('watch', ['scss'], function() {
  // gulp.watch('gulpfile.js');
  gulp.watch('./app/sass/**', ['scss']);
});
