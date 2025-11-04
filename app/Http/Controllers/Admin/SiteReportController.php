<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use ZipArchive;

class SiteReportController extends Controller
{
    public function download(Request $request)
    {
        $zipFile = storage_path('app/site_report.zip');
        $zip = new ZipArchive;
        if ($zip->open($zipFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) === TRUE) {
            // Add all files from storage/app/public
            $files = Storage::files('public');
            foreach ($files as $file) {
                $zip->addFile(storage_path('app/' . $file), $file);
            }
            // Add activity log (example: from system_activities table)
            $activities = DB::table('system_activities')->get();
            $activityCsv = "id,description,created_at\n";
            foreach ($activities as $activity) {
                $activityCsv .= "{$activity->id},\"{$activity->description}\",{$activity->created_at}\n";
            }
            $zip->addFromString('activity_log.csv', $activityCsv);
            $zip->close();
        } else {
            return response()->json(['error' => 'Could not create zip file'], 500);
        }
        return response()->download($zipFile)->deleteFileAfterSend(true);
    }
}
