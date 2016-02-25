var gulp = require('gulp');
var sass = require('gulp-sass');
var minifycss = require('gulp-minify-css');
var uglify = require('gulp-uglify');
var copy = require('gulp-copy');
var rename = require('gulp-rename');
var notify = require('gulp-notify');
var concat = require('gulp-concat');
var plumber = require('gulp-plumber');
var browserSync = require('browser-sync');
var reload = browserSync.reload;

/* Add your JS files here, they will be combined in this order */
var scripts = [
  'src/js/**/*.js'
];

var stylesheets = [
  './src/scss',
  './node_modules/foundation-apps/scss'
];

/* Scripts task */
gulp.task('scripts', function() {
  return gulp.src(scripts)
    .pipe(concat('scripts.js'))
    .pipe(gulp.dest('dist/js'))
    .pipe(rename({ suffix: '.min' }))
    .pipe(uglify())
    .pipe(gulp.dest('dist/js'));
});

/* Sass task */
gulp.task('sass', function () {
  gulp.src('src/scss/main.scss')
    .pipe(plumber())
    .pipe(sass({ includePaths: stylesheets }))
    .pipe(gulp.dest('dist/css'))
    .pipe(rename({ suffix: '.min' }))
    .pipe(minifycss())
    .pipe(gulp.dest('dist/css'))
    /* Reload the browser CSS after every change */
    .pipe(reload({ stream: true }));
});

gulp.task('copy', function () {
  return gulp.src('src/assets/*')
    .pipe(copy('dist/assets/', { prefix: 2 }));
});

/* Reload task */
gulp.task('bs-reload', function () {
  browserSync.reload();
});

/* Prepare Browser-sync for localhost */
gulp.task('browser-sync', function() {
  browserSync.init(['dist/css/*.css', 'dist/js/*.js'], {
    proxy: 'localhost:' + (process.env.PORT || 3000)
  });
});

/* Watch scss, js and html files, doing different things with each. */
gulp.task('default', ['sass', 'scripts', 'copy', 'browser-sync'], function () {
  /* Watch scss, run the sass task on change. */
  gulp.watch(['src/scss/**/*.scss'], ['sass'])
  /* Watch app.js file, run the scripts task on change. */
  gulp.watch(['src/js/**/*.js'], ['scripts'])
  /* Watch .html files, run the bs-reload task on change. */
  gulp.watch(['views/**/*.handlebars', 'app.js'], ['bs-reload']);
  /* Watch assets, copy and bs-reload on change. */
  gulp.watch(['src/assets/*'], ['copy', 'bs-reload']);
});
