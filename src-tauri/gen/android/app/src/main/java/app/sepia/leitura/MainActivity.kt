package app.sepia.leitura

import android.os.Bundle
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  // O WebView nem sempre expõe env(safe-area-inset-*) no modo edge-to-edge,
  // então repassamos as margens do sistema como variáveis CSS.
  override fun onWebViewCreate(webView: WebView) {
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
