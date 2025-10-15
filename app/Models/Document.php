<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Document extends Model
{
    protected $table = 'documents';

    protected $fillable = [
        'title', 'description', 'path', 'mime', 'size', 'visibility', 'created_by'
    ];

    protected $casts = [
        'size' => 'integer',
    ];

    // return a public url for the stored file when available
    public function getUrlAttribute()
    {
        if ($this->path) {
            try {
                return Storage::url($this->path);
            } catch (\Exception $e) {
                return null;
            }
        }
        return null;
    }
}
