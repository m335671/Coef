package app.edclone.notifications

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Notifications locales uniquement : aucun service push, aucun jeton, aucun SDK tiers.
class NotificationsLocalesModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("Contexte Android indisponible")

  override fun definition() = ModuleDefinition {
    Name("NotificationsLocales")

    AsyncFunction("autorisees") { NotificationManagerCompat.from(context).areNotificationsEnabled() }

    AsyncFunction("afficher") { id: Int, titre: String, texte: String -> afficher(id, titre, texte) }
  }

  // Permission vérifiée juste avant (areNotificationsEnabled), et SecurityException rattrapée.
  @SuppressLint("MissingPermission")
  private fun afficher(id: Int, titre: String, texte: String): Boolean {
    val gestionnaire = NotificationManagerCompat.from(context)
    if (!gestionnaire.areNotificationsEnabled()) return false
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.getSystemService(NotificationManager::class.java)
        .createNotificationChannel(NotificationChannel(CANAL, "Nouvelles notes", NotificationManager.IMPORTANCE_DEFAULT))
    }
    val ouvrir = context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
      PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }
    // ponytail: icône de l'app comme petite icône ; une icône monochrome dédiée viendra avec le design (étape 5).
    val icone = context.applicationInfo.icon
    val notification = NotificationCompat.Builder(context, CANAL)
      .setSmallIcon(icone)
      .setContentTitle(titre)
      .setContentText(texte)
      .setStyle(NotificationCompat.BigTextStyle().bigText(texte))
      // Rien sur l'écran verrouillé, quel que soit le réglage « contenu sensible » du téléphone (essai du
      // 17/11/2026 : VISIBILITY_PRIVATE laissait tout voir). Réglage dans l'app prévu à l'étape 5.
      .setVisibility(NotificationCompat.VISIBILITY_SECRET)
      .setContentIntent(ouvrir)
      .setAutoCancel(true)
      .build()
    return try {
      gestionnaire.notify(id, notification)
      true
    } catch (e: SecurityException) {
      false
    }
  }

  companion object {
    private const val CANAL = "nouvelles-notes"
  }
}
