package app.coef.couleurs

import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Couleur de Material You (tirée du fond d'écran par Android 12+), lue localement : rien ne quitte le téléphone.
class CouleursSystemeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CouleursSysteme")

    // « #RRGGBB », ou null avant Android 12.
    Function("accent") {
      val contexte = appContext.reactContext
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && contexte != null) {
        String.format("#%06X", 0xFFFFFF and contexte.getColor(android.R.color.system_accent1_500))
      } else {
        null
      }
    }
  }
}
