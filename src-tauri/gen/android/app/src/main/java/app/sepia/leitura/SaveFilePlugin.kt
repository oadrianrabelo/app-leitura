package app.sepia.leitura

import android.app.Activity
import android.content.Intent
import androidx.activity.result.ActivityResult
import app.tauri.annotation.ActivityCallback
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.File

/**
 * "Salvar como" do Android: a leitora escolhe onde guardar o backup (Downloads,
 * Google Drive, outro app…) e copiamos o arquivo temporário para lá.
 */
@TauriPlugin
class SaveFilePlugin(private val activity: Activity) : Plugin(activity) {

  private var pendingPath: String? = null

  @Command
  fun save(invoke: Invoke) {
    val args = invoke.getArgs()
    val path = args.getString("path")
    if (path.isNullOrEmpty()) {
      invoke.reject("Arquivo de backup não encontrado")
      return
    }
    pendingPath = path
    val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = args.getString("mime") ?: "application/zip"
      putExtra(Intent.EXTRA_TITLE, args.getString("name") ?: "sepia-backup.zip")
    }
    startActivityForResult(invoke, intent, "onSaved")
  }

  @ActivityCallback
  fun onSaved(invoke: Invoke, result: ActivityResult) {
    val uri = result.data?.data
    val path = pendingPath
    pendingPath = null
    if (result.resultCode != Activity.RESULT_OK || uri == null || path == null) {
      invoke.reject("Salvamento cancelado", "cancelled")
      return
    }
    Thread {
      try {
        val file = File(path)
        activity.contentResolver.openOutputStream(uri)?.use { out ->
          file.inputStream().use { it.copyTo(out) }
        } ?: throw IllegalStateException("Não foi possível abrir o destino")
        file.delete()
        val out = JSObject()
        out.put("saved", true)
        invoke.resolve(out)
      } catch (e: Exception) {
        invoke.reject("Não foi possível salvar o backup: ${e.message ?: "erro desconhecido"}")
      }
    }.start()
  }
}
