package dev.html2apk.bridge;

import android.content.ContentResolver;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONObject;

public class Html2ApkContactsManager {
    public static void pesquisarContato(CordovaPlugin plugin, String query, CallbackContext callbackContext) {
        plugin.cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                JSONArray resultados = new JSONArray();
                ContentResolver cr = plugin.cordova.getActivity().getContentResolver();
                Uri uri = ContactsContract.CommonDataKinds.Phone.CONTENT_URI;
                String[] projection = new String[]{
                        ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                        ContactsContract.CommonDataKinds.Phone.NUMBER
                };
                
                String selection = null;
                String[] selectionArgs = null;
                
                if (query != null && !query.trim().isEmpty()) {
                    selection = ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " LIKE ? OR " +
                                ContactsContract.CommonDataKinds.Phone.NUMBER + " LIKE ?";
                    String likeQuery = "%" + query.trim() + "%";
                    selectionArgs = new String[]{likeQuery, likeQuery};
                }

                Cursor cursor = null;
                try {
                    cursor = cr.query(uri, projection, selection, selectionArgs, ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC");
                    if (cursor != null && cursor.moveToFirst()) {
                        int nameIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME);
                        int numberIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER);
                        
                        do {
                            String name = cursor.getString(nameIndex);
                            String number = cursor.getString(numberIndex);
                            JSONObject contact = new JSONObject();
                            contact.put("nome", name != null ? name : "");
                            contact.put("numero", number != null ? number : "");
                            resultados.put(contact);
                            
                            if (resultados.length() >= 50) { // Limit results to 50 for performance
                                break;
                            }
                        } while (cursor.moveToNext());
                    }
                    callbackContext.success(resultados);
                } catch (Exception e) {
                    callbackContext.error("Erro ao pesquisar contatos: " + e.getMessage());
                } finally {
                    if (cursor != null) {
                        cursor.close();
                    }
                }
            }
        });
    }
}
