package app.sepia.leitura

import android.os.Bundle
import android.view.KeyEvent
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
  private var webView: WebView? = null

  /** Ligado pelo leitor (livro aberto + opção ativa): volume vira a página */
  @Volatile private var volumePaging = false

  /** Ponte mínima para a interface: só liga/desliga os botões de volume */
  inner class SepiaNative {
    @JavascriptInterface
    fun setVolumePaging(on: Boolean) {
      volumePaging = on
    }
  }

  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    val code = event.keyCode
    if (volumePaging && (code == KeyEvent.KEYCODE_VOLUME_DOWN || code == KeyEvent.KEYCODE_VOLUME_UP)) {
      // Consome o aperto e o soltar (senão o som muda); vira só no aperto, e segurar repete
      if (event.action == KeyEvent.ACTION_DOWN) {
        val dir = if (code == KeyEvent.KEYCODE_VOLUME_DOWN) 1 else -1
        webView?.evaluateJavascript(
          "window.dispatchEvent(new CustomEvent('sepia-volume', { detail: $dir }))", null
        )
      }
      return true
    }
    return super.dispatchKeyEvent(event)
  }
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  // O WebView nem sempre expõe env(safe-area-inset-*) no modo edge-to-edge,
  // então repassamos as margens do sistema como variáveis CSS.
  override fun onWebViewCreate(webView: WebView) {
    this.webView = webView
    webView.addJavascriptInterface(SepiaNative(), "SepiaNative")
    ViewCompat.setOnApplyWindowInsetsListener(webView) { view, insets ->
      val bars = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
      )
      // Altura do teclado: as folhas sobem para o campo nunca ficar escondido
      val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
      val density = resources.displayMetrics.density
      val js = """
        (function () {
          var s = document.documentElement.style;
          s.setProperty('--native-inset-top', '${bars.top / density}px');
          s.setProperty('--native-inset-bottom', '${bars.bottom / density}px');
          s.setProperty('--native-inset-left', '${bars.left / density}px');
          s.setProperty('--native-inset-right', '${bars.right / density}px');
          s.setProperty('--native-inset-ime', '${ime.bottom / density}px');
        })();
      """.trimIndent()
      (view as WebView).evaluateJavascript(js, null)
      view.postDelayed({ view.evaluateJavascript(js, null) }, 600)
      insets
    }
  }
}
