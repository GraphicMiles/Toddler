package ai.forgeai.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@CapacitorPlugin(name = "GithubRuntime")
public class GithubRuntime extends Plugin {
    private static final int MAX_API_CHARS = 2_000_000;
    private static final int MAX_ARCHIVE_FILES = 5000;
    private static final long MAX_ARCHIVE_BYTES = 250L * 1024L * 1024L;
    private final ExecutorService executor = Executors.newCachedThreadPool();

    private HttpURLConnection connection(String url, String method) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        connection.setConnectTimeout(20000); connection.setReadTimeout(60000); connection.setInstanceFollowRedirects(true);
        connection.setRequestMethod(method); connection.setRequestProperty("Accept", "application/vnd.github+json");
        connection.setRequestProperty("X-GitHub-Api-Version", "2022-11-28"); connection.setRequestProperty("User-Agent", "ForgeAI-Android/1.0");
        String token = CredentialVault.getToken(getContext());
        if (!token.isEmpty()) connection.setRequestProperty("Authorization", "Bearer " + token);
        return connection;
    }

    @PluginMethod
    public void api(PluginCall call) {
        String path = call.getString("path", "").trim();
        String method = call.getString("method", "GET").toUpperCase(Locale.ROOT);
        String body = call.getString("body", "");
        if (!path.startsWith("/repos/") || path.contains("..") || !method.matches("GET|POST|PUT|PATCH|DELETE")) { call.reject("Only validated /repos/ GitHub API paths are allowed."); return; }
        if (!"GET".equals(method) && !AutonomyRuntime.isEnabled(getContext())) { call.reject("Full Autonomous mode is required for GitHub writes.", "AUTONOMY_DISABLED"); return; }
        executor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                connection = connection("https://api.github.com" + path, method);
                if (!body.isEmpty() && !"GET".equals(method)) {
                    connection.setDoOutput(true); connection.setRequestProperty("Content-Type", "application/json");
                    connection.getOutputStream().write(body.getBytes(StandardCharsets.UTF_8));
                }
                int code = connection.getResponseCode();
                InputStream stream = code >= 400 ? connection.getErrorStream() : connection.getInputStream();
                StringBuilder output = new StringBuilder();
                if (stream != null) try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                    char[] buffer = new char[8192]; int count;
                    while ((count = reader.read(buffer)) != -1) { if (output.length() + count > MAX_API_CHARS) throw new IllegalArgumentException("GitHub response exceeded output limit."); output.append(buffer, 0, count); }
                }
                JSObject result = new JSObject(); result.put("status", code); result.put("method", method); result.put("path", path); result.put("body", output.toString()); result.put("ok", code >= 200 && code < 300); call.resolve(result);
            } catch (Exception error) { call.reject(error.getMessage(), "GITHUB_API_FAILED"); }
            finally { if (connection != null) connection.disconnect(); }
        });
    }

    private String[] parseRepo(String value) {
        String cleaned = value.trim().replace("https://github.com/", "").replaceAll("\\.git$", "");
        String[] parts = cleaned.split("/");
        if (parts.length != 2 || !parts[0].matches("[A-Za-z0-9_.-]+") || !parts[1].matches("[A-Za-z0-9_.-]+")) throw new IllegalArgumentException("Repository must be owner/name or a github.com URL.");
        return parts;
    }

    @PluginMethod
    public void importArchive(PluginCall call) {
        String repository = call.getString("repository", "");
        String ref = call.getString("ref", "HEAD").trim();
        if (!ref.matches("[A-Za-z0-9_./-]+")) { call.reject("Invalid Git reference."); return; }
        executor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                String[] repo = parseRepo(repository);
                connection = connection("https://api.github.com/repos/" + repo[0] + "/" + repo[1] + "/zipball/" + ref, "GET");
                int code = connection.getResponseCode();
                if (code < 200 || code >= 300 || !"https".equalsIgnoreCase(connection.getURL().getProtocol())) throw new IllegalArgumentException("GitHub archive download failed with HTTP " + code + ".");
                File repositories = new File(getContext().getFilesDir(), "repositories"); if (!repositories.exists() && !repositories.mkdirs()) throw new IllegalArgumentException("Unable to create repository storage.");
                File target = new File(repositories, repo[0] + "-" + repo[1] + "-" + UUID.randomUUID()).getCanonicalFile();
                if (!target.mkdirs()) throw new IllegalArgumentException("Unable to create imported repository.");
                int files = 0; long bytes = 0; String rootPrefix = null;
                try (ZipInputStream zip = new ZipInputStream(connection.getInputStream())) {
                    ZipEntry entry;
                    byte[] buffer = new byte[32768];
                    while ((entry = zip.getNextEntry()) != null) {
                        String name = entry.getName().replace('\\', '/');
                        if (rootPrefix == null && name.contains("/")) rootPrefix = name.substring(0, name.indexOf('/') + 1);
                        if (rootPrefix != null && name.startsWith(rootPrefix)) name = name.substring(rootPrefix.length());
                        if (name.isEmpty()) continue;
                        File output = new File(target, name).getCanonicalFile();
                        if (!output.toPath().startsWith(target.toPath())) throw new IllegalArgumentException("Archive attempted path traversal.");
                        if (entry.isDirectory()) { output.mkdirs(); continue; }
                        files++; if (files > MAX_ARCHIVE_FILES) throw new IllegalArgumentException("Repository archive contains too many files.");
                        File parent = output.getParentFile(); if (!parent.exists() && !parent.mkdirs()) throw new IllegalArgumentException("Unable to create repository folder.");
                        try (FileOutputStream file = new FileOutputStream(output)) {
                            int count;
                            while ((count = zip.read(buffer)) != -1) { bytes += count; if (bytes > MAX_ARCHIVE_BYTES) throw new IllegalArgumentException("Repository archive exceeds 250 MiB."); file.write(buffer, 0, count); }
                        }
                    }
                }
                JSObject result = new JSObject(); result.put("repository", repo[0] + "/" + repo[1]); result.put("ref", ref); result.put("path", target.getAbsolutePath()); result.put("files", files); result.put("bytes", bytes); result.put("gitHistory", false); call.resolve(result);
            } catch (Exception error) { call.reject(error.getMessage(), "GITHUB_IMPORT_FAILED"); }
            finally { if (connection != null) connection.disconnect(); }
        });
    }
}
