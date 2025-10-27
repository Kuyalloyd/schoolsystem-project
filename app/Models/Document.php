<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Document extends Model
{
    protected $table = 'documents';

    protected $fillable = [
        'title', 'description', 'path', 'mime', 'size', 'visibility', 'created_by', 'category', 'share_token', 'share_expires_at', 'starred'
    ];

    protected $casts = [
        'size' => 'integer',
        'share_expires_at' => 'datetime',
        'starred' => 'boolean',
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

    // Generate a unique share token
    public function generateShareToken()
    {
        $this->share_token = bin2hex(random_bytes(32));
        $this->share_expires_at = null; // No expiration by default, can be set if needed
        $this->save();
        return $this->share_token;
    }

    // Get shareable link
    public function getShareLinkAttribute()
    {
        if ($this->share_token) {
            return url("/shared/documents/{$this->share_token}");
        }
        return null;
    }

    // Check if share link is valid
    public function isShareLinkValid()
    {
        if (!$this->share_token) {
            return false;
        }
        
        if ($this->share_expires_at && $this->share_expires_at->isPast()) {
            return false;
        }
        
        return true;
    }
}
