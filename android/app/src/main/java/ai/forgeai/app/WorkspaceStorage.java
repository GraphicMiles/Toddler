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
import java.nio.charset.StandardCharsets;

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

    private DocumentFile resolve(DocumentFile root, String relative, boolean createFolders) {
        if (relative == null || relative.contains("..")) throw new IllegalArgumentException("Unsafe workspace path.");
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
}
