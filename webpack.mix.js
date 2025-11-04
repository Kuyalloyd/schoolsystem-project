const mix = require('laravel-mix');

mix.js('resources/js/app.js', 'public/js')
   .react() // important
   .sass('resources/sass/app.scss', 'public/css')
   .version(); // Enable cache busting
