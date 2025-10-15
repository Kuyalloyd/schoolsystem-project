<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;

$ids = array_slice($argv, 1);
if (empty($ids)) {
    echo "Usage: php scripts/permanent-delete-users.php <id1> <id2> ...\n";
    exit(1);
}

foreach ($ids as $id) {
    $u = User::withTrashed()->find($id);
    if (!$u) {
        echo "User id {$id} not found\n";
        continue;
    }
    try {
        // Log some info before deleting
        echo "Deleting user: id={$u->id}, email={$u->email}, name={$u->name}, trashed=" . ($u->trashed() ? 'yes' : 'no') . "\n";
        $u->forceDelete();
        echo "Deleted id={$id}\n";
    } catch (Exception $e) {
        echo "Failed to delete id={$id}: " . $e->getMessage() . "\n";
    }
}
