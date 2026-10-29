package app.sepia.leitura

import android.app.Activity
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import com.google.mlkit.common.MlKitException
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning

/**
 * Lê o código de barras do verso do livro com o leitor do Google Play Services:
 * a tela da câmera é do próprio Google, não precisa de permissão de câmera e
 * não depende do WebView.
 */
@TauriPlugin
class BarcodePlugin(private val activity: Activity) : Plugin(activity) {

  private val options = GmsBarcodeScannerOptions.Builder()
    .setBarcodeFormats(Barcode.FORMAT_EAN_13, Barcode.FORMAT_EAN_8, Barcode.FORMAT_UPC_A)
    .enableAutoZoom()
    .build()

  @Command
  fun scan(invoke: Invoke) {
    GmsBarcodeScanning.getClient(activity, options)
      .startScan()
      .addOnSuccessListener { barcode ->
        val out = JSObject()
        out.put("content", barcode.rawValue ?: "")
        invoke.resolve(out)
      }
      .addOnCanceledListener { invoke.reject("Leitura cancelada", "cancelled") }
      .addOnFailureListener { e ->
        val waiting = e is MlKitException && e.errorCode == MlKitException.UNAVAILABLE
        invoke.reject(
          if (waiting) "O leitor do Google está sendo instalado. Tente de novo em alguns segundos."
          else e.message ?: "Não foi possível abrir o leitor de código de barras"
        )
      }
  }
}
