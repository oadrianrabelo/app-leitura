package app.sepia.leitura

import android.app.Activity
import androidx.activity.result.ActivityResult
import androidx.activity.result.IntentSenderRequest
import app.tauri.annotation.ActivityCallback
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.api.Scope

/**
 * Autoriza o Sépia a usar a pasta privada do app no Google Drive, com a conta
 * Google do próprio aparelho. Devolve um token de acesso (vale ~1 hora; pedir
 * de novo sem interação renova sem mostrar nada).
 */
@TauriPlugin
class GoogleAuthPlugin(private val activity: Activity) : Plugin(activity) {

  private val request = AuthorizationRequest.builder()
    .setRequestedScopes(listOf(Scope("https://www.googleapis.com/auth/drive.appdata")))
    .build()

  @Command
  fun authorize(invoke: Invoke) {
    val interactive = invoke.getArgs().getBoolean("interactive", true)
    Identity.getAuthorizationClient(activity)
      .authorize(request)
      .addOnSuccessListener { result ->
        if (result.hasResolution()) {
          if (!interactive) {
            invoke.reject("Autorização necessária", "consent-required")
            return@addOnSuccessListener
          }
          val sender = result.pendingIntent?.intentSender
          if (sender == null) {
            invoke.reject("Não foi possível abrir a escolha de conta")
            return@addOnSuccessListener
          }
          startIntentSenderForResult(invoke, IntentSenderRequest.Builder(sender).build(), "onAuthorized")
        } else {
          resolveWith(invoke, result)
        }
      }
      .addOnFailureListener { e -> invoke.reject(e.message ?: "Falha ao autorizar com o Google") }
  }

  @ActivityCallback
  fun onAuthorized(invoke: Invoke, result: ActivityResult) {
    if (result.resultCode != Activity.RESULT_OK) {
      invoke.reject("Login cancelado", "cancelled")
      return
    }
    try {
      val auth = Identity.getAuthorizationClient(activity).getAuthorizationResultFromIntent(result.data)
      resolveWith(invoke, auth)
    } catch (e: Exception) {
      invoke.reject(e.message ?: "Falha ao autorizar com o Google")
    }
  }

  private fun resolveWith(invoke: Invoke, result: AuthorizationResult) {
    val token = result.accessToken
    if (token == null) {
      invoke.reject("O Google não devolveu um token de acesso")
      return
    }
    val out = JSObject()
    out.put("accessToken", token)
    invoke.resolve(out)
  }
}
