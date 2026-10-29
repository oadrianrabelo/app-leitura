package app.sepia.leitura

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Baixa o APK de uma nova versão e abre o instalador do Android.
 * O Android sempre pede uma confirmação da usuária antes de instalar.
 */
@TauriPlugin
class UpdateInstallerPlugin(private val activity: Activity) : Plugin(activity) {

  @Command
  fun install(invoke: Invoke) {
    val url = invoke.getArgs().getString("url")
    if (url.isNullOrBlank()) {
      invoke.reject("URL da atualização ausente")
      return
    }

    // A partir do Android 8, a instalação precisa ser liberada para o app.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
      !activity.packageManager.canRequestPackageInstalls()
    ) {
      val intent = Intent(
        Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
        Uri.parse("package:${activity.packageName}")
      )
      activity.startActivity(intent)
      val result = JSObject()
      result.put("status", "permission-required")
      invoke.resolve(result)
      return
    }

    Thread {
      try {
        val dir = File(activity.cacheDir, "updates").apply { mkdirs() }
        dir.listFiles()?.forEach { it.delete() }
        val apk = File(dir, "sepia-update.apk")
        download(url, apk)

        val uri = FileProvider.getUriForFile(
          activity,
          "${activity.packageName}.fileprovider",
          apk
        )
        val intent = Intent(Intent.ACTION_VIEW).apply {
          setDataAndType(uri, "application/vnd.android.package-archive")
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        activity.runOnUiThread { activity.startActivity(intent) }

        val result = JSObject()
        result.put("status", "installing")
        invoke.resolve(result)
      } catch (e: Exception) {
        invoke.reject("Não foi possível baixar a atualização: ${e.message}")
      }
    }.start()
  }

  private fun download(source: String, target: File) {
    var current = URL(source)
    // O GitHub redireciona os downloads; seguimos manualmente entre domínios.
    repeat(5) {
      val connection = current.openConnection() as HttpURLConnection
      connection.instanceFollowRedirects = false
      connection.connectTimeout = 15_000
      connection.readTimeout = 30_000
      val code = connection.responseCode
      if (code in 300..399) {
        val location = connection.getHeaderField("Location")
        connection.disconnect()
        current = URL(current, location)
        return@repeat
      }
      if (code != HttpURLConnection.HTTP_OK) {
        connection.disconnect()
        throw IllegalStateException("HTTP $code")
      }
      connection.inputStream.use { input ->
        target.outputStream().use { output -> input.copyTo(output) }
      }
      connection.disconnect()
      return
    }
    throw IllegalStateException("Redirecionamentos demais")
  }
}
