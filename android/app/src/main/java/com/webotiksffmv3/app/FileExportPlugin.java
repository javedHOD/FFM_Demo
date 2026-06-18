package com.webotiksffmv3.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "FileExport")
public class FileExportPlugin extends Plugin {

    @PluginMethod
    public void saveToDownloads(PluginCall call) {
        String filename = call.getString("filename");
        String content = call.getString("content");
        String mimeType = call.getString("mimeType", "text/csv");

        if (filename == null || filename.isEmpty() || content == null) {
            call.reject("filename and content are required");
            return;
        }

        try {
            Uri uri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                uri = saveWithMediaStore(filename, content, mimeType);
            } else {
                uri = saveLegacy(filename, content);
            }

            if (uri == null) {
                call.reject("Failed to save file to Downloads");
                return;
            }

            JSObject ret = new JSObject();
            ret.put("uri", uri.toString());
            ret.put("filename", filename);
            ret.put("path", "Downloads/" + filename);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Save failed: " + e.getMessage(), e);
        }
    }

    private Uri saveWithMediaStore(String filename, String content, String mimeType) throws Exception {
        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

        Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
        if (uri == null) {
            return null;
        }

        try (OutputStream os = resolver.openOutputStream(uri)) {
            if (os == null) {
                resolver.delete(uri, null, null);
                return null;
            }
            os.write(content.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            resolver.delete(uri, null, null);
            throw e;
        }

        return uri;
    }

    private Uri saveLegacy(String filename, String content) throws Exception {
        File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        if (!dir.exists() && !dir.mkdirs()) {
            return null;
        }

        File file = new File(dir, filename);
        try (FileOutputStream fos = new FileOutputStream(file)) {
            fos.write(content.getBytes(StandardCharsets.UTF_8));
        }

        return Uri.fromFile(file);
    }
}
