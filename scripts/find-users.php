<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;

$q = $argv[1] ?? 'john';
$users = User::withTrashed()->where('name', 'like', "%{$q}%")->orWhere('email', 'like', "%{$q}%")->get();
$out = $users->map(function($u){
    return [
        'id' => $u->id,
        'name' => $u->name,
        'email' => $u->email,
        'role' => $u->role,
        'is_locked' => (bool)$u->is_locked,
        'trashed' => method_exists($u, 'trashed') ? $u->trashed() : false,
    ];
});
echo $out->toJson(JSON_PRETTY_PRINT);
