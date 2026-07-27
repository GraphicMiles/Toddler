package ai.forgeai.app;

import android.content.Intent;
import android.net.Uri;
import androidx.documentfile.provider.DocumentFile;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.ByteArrayOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.io.File;
import java.io.FileOutputStream;
import java.security.MessageDigest;

@CapacitorPlugin(name = "WorkspaceStorage")
public class WorkspaceStorage extends Plugin {
    private static final int PICK_TREE = 4101;
    private Uri rootUri;
    private PluginCall pendingPick;

    @PluginMethod
    public void pickFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        pendingPick = call;
        startActivityForResult(call, intent, PICK_TREE);
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);
        if (requestCode != PICK_TREE || data == null || data.getData() == null) return;
        rootUri = data.getData();
        int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        try { getContext().getContentResolver().takePersistableUriPermission(rootUri, flags); } catch (Exception ignored) {}
        JSObject result = new JSObject(); result.put("uri", rootUri.toString());
        if (pendingPick != null) { pendingPick.resolve(result); pendingPick = null; }
        notifyListeners("folderSelected", result);
    }

    private DocumentFile root(PluginCall call) {
        String uri = call.getString("uri", rootUri == null ? "" : rootUri.toString());
        if (uri.isEmpty()) throw new IllegalArgumentException("Choose a workspace folder first.");
        rootUri = Uri.parse(uri);
        DocumentFile root = DocumentFile.fromTreeUri(getContext(), rootUri);
        if (root == null || !root.isDirectory()) throw new IllegalArgumentException("Workspace folder is unavailable.");
        return root;
    }

    private boolean blocked(String path) {
        String name = path == null ? "" : path.substring(path.lastIndexOf('/') + 1).toLowerCase();
        return name.equals(".env") || name.startsWith(".env.") || name.equals("id_rsa") || name.equals("id_ed25519") || name.endsWith(".pem") || name.endsWith(".key") || name.contains("credential") || name.contains("secret");
    }

    private DocumentFile resolve(DocumentFile root, String relative, boolean createFolders) {
        if (relative == null || relative.contains("..") || relative.startsWith("/") || blocked(relative)) throw new IllegalArgumentException("Unsafe or protected workspace path.");
        DocumentFile current = root;
        for (String part : relative.split("/")) {
            if (part.isEmpty()) continue;
            DocumentFile next = current.findFile(part);
            if (next == null && createFolders) next = current.createDirectory(part);
            if (next == null) throw new IllegalArgumentException("Workspace path not found.");
            current = next;
        }
        return current;
    }

    @PluginMethod
    public void list(PluginCall call) {
        try {
            JSObject result = new JSObject();
            result.put("children", listNode(root(call), "", 0));
            call.resolve(result);
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    private JSArray listNode(DocumentFile dir, String parent, int depth) {
        JSArray array = new JSArray(); if (depth > 8) return array;
        for (DocumentFile f : dir.listFiles()) {
            String name = f.getName() == null ? "" : f.getName();
            if (name.isEmpty()) continue;
            JSObject item = new JSObject(); item.put("name", name); item.put("type", f.isDirectory() ? "folder" : "file");
            String path = parent.isEmpty() ? name : parent + "/" + name; item.put("path", path);
            if (f.isDirectory()) item.put("children", listNode(f, path, depth + 1));
            array.put(item);
        }
        return array;
    }

    @PluginMethod
    public void createFile(PluginCall call) { try { DocumentFile root = root(call); String path = call.getString("path", ""); int slash = path.lastIndexOf('/'); DocumentFile dir = resolve(root, slash < 0 ? "" : path.substring(0, slash), true); String name = slash < 0 ? path : path.substring(slash + 1); if (name.startsWith(".")) throw new IllegalArgumentException("Hidden files are blocked."); DocumentFile f = dir.createFile("text/plain", name); if (f == null) throw new IllegalArgumentException("Unable to create file."); call.resolve(); } catch (Exception e) { call.reject(e.getMessage()); } }
    @PluginMethod
    public void createFolder(PluginCall call) { try { DocumentFile root = root(call); DocumentFile f = resolve(root, call.getString("path", ""), true); if (f == null) throw new IllegalArgumentException("Unable to create folder."); call.resolve(); } catch (Exception e) { call.reject(e.getMessage()); } }
    @PluginMethod
    public void readFile(PluginCall call) { try { DocumentFile f = resolve(root(call), call.getString("path", ""), false); try (InputStream in = getContext().getContentResolver().openInputStream(f.getUri()); ByteArrayOutputStream bytes = new ByteArrayOutputStream()) { byte[] buffer = new byte[8192]; int n; while ((n = in.read(buffer)) != -1) bytes.write(buffer, 0, n); JSObject result = new JSObject(); result.put("content", new String(bytes.toByteArray(), StandardCharsets.UTF_8)); call.resolve(result); } } catch (Exception e) { call.reject(e.getMessage()); } }
    @PluginMethod
    public void writeFile(PluginCall call) { try { DocumentFile f = resolve(root(call), call.getString("path", ""), false); try (OutputStream out = getContext().getContentResolver().openOutputStream(f.getUri(), "wt")) { out.write(call.getString("content", "").getBytes(StandardCharsets.UTF_8)); } call.resolve(); } catch (Exception e) { call.reject(e.getMessage()); } }

    @PluginMethod
    public void rename(PluginCall call) { try { String path = call.getString("path", ""); String name = call.getString("newName", ""); if (name.isEmpty() || name.contains("/") || blocked(name)) throw new IllegalArgumentException("Invalid or protected name."); DocumentFile f = resolve(root(call), path, false); if (!f.renameTo(name)) throw new IllegalArgumentException("Unable to rename item."); call.resolve(); } catch (Exception e) { call.reject(e.getMessage()); } }

    @PluginMethod
    public void delete(PluginCall call) { try { String path = call.getString("path", ""); if (blocked(path)) throw new IllegalArgumentException("Protected files cannot be deleted."); DocumentFile f = resolve(root(call), path, false); if (!f.delete()) throw new IllegalArgumentException("Unable to delete item."); call.resolve(); } catch (Exception e) { call.reject(e.getMessage()); } }

    @PluginMethod
    public void inspect(PluginCall call) { try { DocumentFile f = resolve(root(call), call.getString("path", ""), false); String mime = f.getType() == null ? "" : f.getType(); boolean binary = !mime.startsWith("text/") && !mime.contains("json") && !mime.contains("javascript") && !mime.contains("xml"); JSObject result = new JSObject(); result.put("binary", binary); result.put("mimeType", mime); call.resolve(result); } catch (Exception e) { call.reject(e.getMessage()); } }

    @PluginMethod
    public void importToRuntime(PluginCall call) {
        new Thread(() -> {
            try {
                DocumentFile source = resolve(root(call), call.getString("path", ""), false);
                String name = source.getName() == null ? "model.gguf" : source.getName();
                if (!name.toLowerCase().endsWith(".gguf")) throw new IllegalArgumentException("Only GGUF models can be imported.");
                File dir = new File(getContext().getFilesDir(), "models"); if (!dir.exists() && !dir.mkdirs()) throw new IllegalArgumentException("Unable to create runtime model directory.");
                File temp = new File(dir, name + ".part"); File target = new File(dir, name);
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                try (InputStream in = getContext().getContentResolver().openInputStream(source.getUri()); FileOutputStream out = new FileOutputStream(temp)) { byte[] buffer = new byte[262144]; int n; while ((n = in.read(buffer)) != -1) { out.write(buffer, 0, n); digest.update(buffer, 0, n); } }
                if (!temp.renameTo(target)) throw new IllegalArgumentException("Unable to finalize imported model.");
                StringBuilder hash = new StringBuilder(); for (byte b : digest.digest()) hash.append(String.format("%02x", b));
                JSObject result = new JSObject(); result.put("runtimePath", target.getAbsolutePath()); result.put("sha256", hash.toString()); result.put("size", target.length()); call.resolve(result);
            } catch (Exception e) { call.reject(e.getMessage()); }
        }).start();
    }

    @PluginMethod
    public void download(PluginCall call) {
        new Thread(() -> {
            try {
                String url = call.getString("url", ""); String path = call.getString("path", "");
                if (!url.startsWith("https://") || blocked(path)) throw new IllegalArgumentException("Only HTTPS model downloads are allowed.");
                DocumentFile folder = root(call); int slash = path.lastIndexOf('/');
                DocumentFile dir = resolve(folder, slash < 0 ? "" : path.substring(0, slash), true);
                String name = slash < 0 ? path : path.substring(slash + 1);
                DocumentFile target = dir.findFile(name); if (target == null) target = dir.createFile("application/octet-stream", name);
                if (target == null) throw new IllegalArgumentException("Unable to create model file.");
                HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection(); connection.setConnectTimeout(20000); connection.setReadTimeout(120000); connection.connect();
                if (connection.getResponseCode() < 200 || connection.getResponseCode() >= 300) throw new IllegalArgumentException("Model download failed: HTTP " + connection.getResponseCode());
                try (InputStream in = connection.getInputStream(); OutputStream out = getContext().getContentResolver().openOutputStream(target.getUri(), "wt")) { byte[] buffer = new byte[262144]; int n; long total = 0; while ((n = in.read(buffer)) != -1) { out.write(buffer, 0, n); total += n; } JSObject result = new JSObject(); result.put("path", path); result.put("size", total); call.resolve(result); }
                connection.disconnect();
            } catch (Exception e) { call.reject(e.getMessage()); }
        }).start();
    }
}
