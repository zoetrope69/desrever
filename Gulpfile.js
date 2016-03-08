var browserify = require('browserify');
var browserSync = require('browser-sync');
var buffer = require('vinyl-buffer');
var copy = require('gulp-copy');
var gulp = require('gulp');
var gutil = require('gulp-util');
var minifycss = require('gulp-minify-css');
var plumber = require('gulp-plumber');
var reload = browserSync.reload;
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var source = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');

/* js files here, they will be combined in this order */
var scripts = [
  'src/js/**/*.js'
];

/* scss/sass files here, they will be combined in this order */
var stylesheets = [
  './src/scss',
  './node_modules/foundation-apps/scss'
];

/* scripts task */
gulp.task('scripts', function () {
  // set up the browserify instance on a task basis
  var b = browserify({
    entries: 'src/js/main.js',
    debug: true
  });

  return b.bundle()
    .pipe(source('scripts.js'))
    .pipe(buffer())
    .pipe(gulp.dest('dist/js'))
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(uglify())
    .on('error', gutil.log)
    .pipe(sourcemaps.write('./', {
      sourceMappingURL: function(file) {
        return 'http://localhost:' + (process.env.PORT || 3000) + '/js/' + file.relative + '.min.map';
      }
    }))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest('dist/js'));
});

/* sass task */
gulp.task('sass', function () {
  gulp.src('src/scss/main.scss')
    .pipe(plumber())
    .pipe(sass({ includePaths: stylesheets }))
    .pipe(gulp.dest('dist/css'))
    .pipe(rename({ suffix: '.min' }))
    .pipe(minifycss())
    .pipe(gulp.dest('dist/css'))
    .pipe(reload({ stream: true })); /* reload the browser CSS after every change */
});

gulp.task('copy', function () {
  return gulp.src('src/assets/*')
    .pipe(copy('dist/assets/', { prefix: 2 }));
});

/* reload page */
gulp.task('bs-reload', function () {
  browserSync.reload();
});

/* prepare browser-sync for localhost */
gulp.task('browser-sync', function() {
  browserSync.init(['dist/css/*.css', 'dist/js/*.js'], {
    proxy: 'localhost:' + (process.env.PORT || 3000),
    ghostMode: false
  });
});

/* watch scss, js and html files, doing different things with each */
gulp.task('default', ['sass', 'scripts', 'copy', 'browser-sync'], function () {
  /* watch scss, run the sass task on change */
  gulp.watch(['src/scss/**/*.scss'], ['sass'])
  /* watch app.js file, run the scripts task on change */
  gulp.watch(['src/js/**/*.js'], ['scripts'])
  /* watch .html files, run the bs-reload task on change */
  gulp.watch(['views/**/*.handlebars', 'app.js'], ['bs-reload']);
  /* watch assets, copy and bs-reload on change */
  gulp.watch(['src/assets/*'], ['copy', 'bs-reload']);
});
