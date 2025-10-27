<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Http\Request;

$r = Request::create('/api/admin/courses', 'POST', [
    'name' => 'CLI Test Course',
    'code' => 'CLI101',
    'credits' => 5,
]);

$c = new App\Http\Controllers\AdminController();
$res = $c->addCourse($r);

if (is_object($res) && method_exists($res, 'getContent')) {
    echo $res->getContent();
} else {
    var_dump($res);
}

echo "\n";