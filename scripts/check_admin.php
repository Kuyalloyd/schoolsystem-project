<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$u = User::where('email','admin@urios.gmail.com')->first();
if ($u) {
    echo 'FOUND: id='.$u->id.' role='.$u->role.' locked='.(($u->is_locked)?'1':'0')."\n";
    echo Hash::check('admin123', $u->password) ? 'PASSWORD_OK\n' : 'PASSWORD_MISMATCH\n';
} else {
    echo 'NOT_FOUND\n';
}
