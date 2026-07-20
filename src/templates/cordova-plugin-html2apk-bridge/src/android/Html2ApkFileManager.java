package dev.html2apk.bridge;

import android.content.Context;
import android.content.Intent;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Environment;
import android.util.Base64;
import android.webkit.MimeTypeMap;

import androidx.core.content.FileProvider;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

public class Html2ApkFileManager {

    private Context context;
    private MediaPlayer mediaPlayer;

    public Html2ApkFileManager(Context context) {
        this.context = context;
    }

    public String obterRaizArmazenamento() {
        return Environment.getExternalStorageDirectory().getAbsolutePath();
    }

    public JSONArray listarDiretorio(String path) throws Exception {
        File dir = new File(path);
        if (!dir.exists() || !dir.isDirectory()) {
            throw new Exception("Diretório não existe ou não é uma pasta: " + path);
        }

        JSONArray result = new JSONArray();
        File[] files = dir.listFiles();
        if (files != null) {
            for (File file : files) {
                JSONObject info = new JSONObject();
                info.put("name", file.getName());
                info.put("path", file.getAbsolutePath());
                info.put("isDir", file.isDirectory());
                info.put("size", file.length());
                info.put("lastModified", file.lastModified());
                info.put("mimeType", guessMimeType(file.getName()));
                result.put(info);
            }
        }
        return result;
    }

    public void criarDiretorio(String path) throws Exception {
        File dir = new File(path);
        if (!dir.exists()) {
            if (!dir.mkdirs()) {
                throw new Exception("Falha ao criar diretório: " + path);
            }
        }
    }

    public String lerArquivoExterno(String path, String formato) throws Exception {
        File file = new File(path);
        if (!file.exists() || !file.isFile()) {
            throw new Exception("Arquivo não existe: " + path);
        }

        try (FileInputStream fis = new FileInputStream(file)) {
            byte[] bytes = new byte[(int) file.length()];
            fis.read(bytes);
            if ("base64".equalsIgnoreCase(formato)) {
                return Base64.encodeToString(bytes, Base64.NO_WRAP);
            } else {
                return new String(bytes, "UTF-8");
            }
        }
    }

    public void salvarArquivoExterno(String path, String conteudo, String formato) throws Exception {
        File file = new File(path);
        File parent = file.getParentFile();
        if (parent != null && !parent.exists()) {
            parent.mkdirs();
        }

        try (FileOutputStream fos = new FileOutputStream(file)) {
            if ("base64".equalsIgnoreCase(formato)) {
                byte[] bytes = Base64.decode(conteudo, Base64.DEFAULT);
                fos.write(bytes);
            } else {
                fos.write(conteudo.getBytes("UTF-8"));
            }
        }
    }

    public void excluirExterno(String path) throws Exception {
        File file = new File(path);
        if (file.exists()) {
            deleteRecursively(file);
        }
    }

    private void deleteRecursively(File fileOrDirectory) throws Exception {
        if (fileOrDirectory.isDirectory()) {
            File[] children = fileOrDirectory.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursively(child);
                }
            }
        }
        if (!fileOrDirectory.delete()) {
            throw new Exception("Falha ao excluir: " + fileOrDirectory.getAbsolutePath());
        }
    }

    public void moverExterno(String sourcePath, String destPath) throws Exception {
        File source = new File(sourcePath);
        File dest = new File(destPath);
        
        if (!source.exists()) {
            throw new Exception("Origem não existe: " + sourcePath);
        }
        
        File parent = dest.getParentFile();
        if (parent != null && !parent.exists()) {
            parent.mkdirs();
        }

        if (!source.renameTo(dest)) {
            copiarExterno(sourcePath, destPath);
            excluirExterno(sourcePath);
        }
    }

    public void copiarExterno(String sourcePath, String destPath) throws Exception {
        File source = new File(sourcePath);
        File dest = new File(destPath);

        if (!source.exists()) {
            throw new Exception("Origem não existe: " + sourcePath);
        }

        if (source.isDirectory()) {
            if (!dest.exists()) dest.mkdirs();
            File[] children = source.listFiles();
            if (children != null) {
                for (File child : children) {
                    copiarExterno(child.getAbsolutePath(), new File(dest, child.getName()).getAbsolutePath());
                }
            }
        } else {
            File parent = dest.getParentFile();
            if (parent != null && !parent.exists()) parent.mkdirs();

            try (InputStream in = new FileInputStream(source);
                 OutputStream out = new FileOutputStream(dest)) {
                byte[] buf = new byte[1024];
                int len;
                while ((len = in.read(buf)) > 0) {
                    out.write(buf, 0, len);
                }
            }
        }
    }

    public void abrirArquivoExterno(String path, boolean exibirUi) throws Exception {
        File file = new File(path);
        if (!file.exists() || !file.isFile()) {
            throw new Exception("Arquivo não existe para abrir: " + path);
        }

        if (!exibirUi) {
            fecharArquivoExterno(); // para o anterior, se houver
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(file.getAbsolutePath());
            mediaPlayer.prepare();
            mediaPlayer.start();
        } else {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            Uri uri;
            try {
                uri = FileProvider.getUriForFile(context, context.getPackageName() + ".provider", file);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } catch (Exception e) {
                uri = Uri.fromFile(file);
            }
            intent.setDataAndType(uri, guessMimeType(file.getName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        }
    }

    public void fecharArquivoExterno() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
            } catch (Exception ignored) {
            }
            mediaPlayer = null;
        }
    }

    private String guessMimeType(String name) {
        String ext = "";
        int i = name.lastIndexOf('.');
        if (i > 0) {
            ext = name.substring(i + 1).toLowerCase();
        }
        if (ext.isEmpty()) return "application/octet-stream";
        String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
        return mime != null ? mime : "application/octet-stream";
    }
}
