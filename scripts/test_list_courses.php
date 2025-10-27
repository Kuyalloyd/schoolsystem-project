<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\AdminController;
use Illuminate\Http\Request;

$c = new AdminController();
$r = Request::create('/api/admin/courses', 'GET', []);
$res = $c->courses($r);
if (method_exists($res, 'getContent')) {
    echo $res->getContent() . "\n";
} else {
    var_dump($res);
}
