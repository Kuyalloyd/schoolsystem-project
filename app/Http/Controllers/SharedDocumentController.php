<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Document;
use Illuminate\Support\Facades\Storage;

class SharedDocumentController extends Controller
{
    // View shared document info
    public function show($token)
    {
        $doc = Document::where('share_token', $token)->firstOrFail();

        if (!$doc->isShareLinkValid()) {
            abort(404, 'This share link has expired or is no longer valid.');
        }

        // Calculate file size
        $fileSize = $doc->size ? round($doc->size / 1024) : 0;
        $sizeStr = $fileSize < 1024 ? $fileSize . ' KB' : round($fileSize / 1024, 1) . ' MB';

        return view('shared-document', [
            'document' => [
                'id' => $doc->id,
                'title' => $doc->title,
                'description' => $doc->description,
                'size' => $sizeStr,
                'mime' => $doc->mime,
                'category' => $doc->category,
                'created_at' => $doc->created_at->format('M d, Y'),
                'token' => $token,
            ]
        ]);
    }

    // Download shared document
    public function download($token)
    {
        $doc = Document::where('share_token', $token)->firstOrFail();

        if (!$doc->isShareLinkValid()) {
            abort(404, 'This share link has expired or is no longer valid.');
        }

        if (!Storage::exists($doc->path)) {
            abort(404, 'File not found');
        }

        return Storage::download($doc->path, $doc->title);
    }
}
