<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    <meta name="csrf-token" content="{{ csrf_token() }}" />
    <title>Father Saturnino Urios University</title>

    {{-- ✅ Only load the main compiled CSS with versioning --}}
    <link rel="stylesheet" href="{{ mix('css/app.css') }}">
  </head>

  <body>
    {{-- ✅ React mounts here --}}
    <div id="app"></div>

    {{-- ✅ Main compiled JavaScript with versioning --}}
    <script src="{{ mix('js/app.js') }}"></script>
    
    {{-- Force reload notification --}}
    <script>
      console.log('%c🔄 FRESH ASSETS LOADED', 'background: #10b981; color: white; font-size: 16px; padding: 10px; font-weight: bold;');
      console.log('Bundle loaded at: {{ now() }}');
      console.log('Mix version: {{ mix("js/app.js") }}');
    </script>
  </body>
</html>
