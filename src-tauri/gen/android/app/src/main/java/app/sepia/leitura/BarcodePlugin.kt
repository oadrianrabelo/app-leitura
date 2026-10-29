package app.sepia.leitura

import android.app.Activity
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import com.google.android.gms.common.moduleinstall.InstallStatusListener
import com.google.android.gms.common.moduleinstall.ModuleInstall
import com.google.android.gms.common.moduleinstall.ModuleInstallRequest
import com.google.android.gms.common.moduleinstall.ModuleInstallStatusUpdate
import com.google.android.gms.common.moduleinstall.ModuleInstallStatusUpdate.InstallState.STATE_CANCELED
import com.google.android.gms.common.moduleinstall.ModuleInstallStatusUpdate.InstallState.STATE_COMPLETED
import com.google.android.gms.common.moduleinstall.ModuleInstallStatusUpdate.InstallState.STATE_FAILED
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScanner
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning

/**
 * Lê o código de barras do verso do livro com o leitor do Google Play Services:
 * a tela da câmera é do próprio Google, não precisa de permissão de câmera e
 * não depende do WebView. O leitor é um módulo baixado sob demanda: se ainda
 * não estiver no aparelho, baixamos antes de abrir.
 */
@TauriPlugin
class BarcodePlugin(private val activity: Activity) : Plugin(activity) {

  private val options = GmsBarcodeScannerOptions.Builder()
    .setBarcodeFormats(Barcode.FORMAT_EAN_13, Barcode.FORMAT_EAN_8, Barcode.FORMAT_UPC_A)
    .build()

  @Command
  fun scan(invoke: Invoke) {
    val scanner = GmsBarcodeScanning.getClient(activity, options)
    val modules = ModuleInstall.getClient(activity)
    modules.areModulesAvailable(scanner)
      .addOnSuccessListener { response ->
        if (response.areModulesAvailable()) start(invoke, scanner)
        else install(invoke, scanner)
      }
      .addOnFailureListener { start(invoke, scanner) }
  }

  private fun install(invoke: Invoke, scanner: GmsBarcodeScanner) {
    val modules = ModuleInstall.getClient(activity)
    var done = false
    val listener = object : InstallStatusListener {
      override fun onInstallStatusUpdated(update: ModuleInstallStatusUpdate) {
        if (done) return
        when (update.installState) {
          STATE_COMPLETED -> {
            done = true
            modules.unregisterListener(this)
            start(invoke, scanner)
          }
          STATE_FAILED,
          STATE_CANCELED -> {
            done = true
            modules.unregisterListener(this)
            invoke.reject("Não foi possível baixar o leitor de código de barras do Google. Confira a internet e tente de novo.")
          }
          else -> {}
        }
      }
    }
    val request = ModuleInstallRequest.newBuilder().addApi(scanner).setListener(listener).build()
    modules.installModules(request)
      .addOnSuccessListener { response ->
        if (response.areModulesAlreadyInstalled() && !done) {
          done = true
          modules.unregisterListener(listener)
          start(invoke, scanner)
        }
      }
      .addOnFailureListener { e ->
        if (!done) {
          done = true
          invoke.reject("Não foi possível baixar o leitor de código de barras: ${e.message ?: "erro desconhecido"}")
        }
      }
  }

  private fun start(invoke: Invoke, scanner: GmsBarcodeScanner) {
    scanner.startScan()
      .addOnSuccessListener { barcode ->
        val out = JSObject()
        out.put("content", barcode.rawValue ?: "")
        invoke.resolve(out)
      }
      .addOnCanceledListener { invoke.reject("Leitura cancelada", "cancelled") }
      .addOnFailureListener { e ->
        invoke.reject("Não foi possível abrir o leitor de código de barras (${e.javaClass.simpleName}: ${e.message ?: "sem detalhes"})")
      }
  }
}
