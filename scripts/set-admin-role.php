<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;

$u = User::find(1);
if ($u) {
    $u->role = 'admin';
    $u->save();
    echo "updated\n";
} else {
    echo "no user\n";
}
