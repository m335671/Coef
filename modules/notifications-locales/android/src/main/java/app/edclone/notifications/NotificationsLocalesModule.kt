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

    // L'app ouverte, les notifications de notes n'ont plus de raison de rester.
    AsyncFunction("effacer") { NotificationManagerCompat.from(context).cancelAll() }

    AsyncFunction("autorisees") { NotificationManagerCompat.from(context).areNotificationsEnabled() }

    AsyncFunction("afficher") { id: Int, titre: String, texte: String, ecranVerrouille: String ->
      afficher(id, titre, texte, ecranVerrouille)
    }
  }

  // Permission vérifiée juste avant (areNotificationsEnabled), et SecurityException rattrapée.
  @SuppressLint("MissingPermission")
  private fun afficher(id: Int, titre: String, texte: String, ecranVerrouille: String): Boolean {
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
      // « rien » (défaut) : invisible tant que le téléphone est verrouillé, quel que soit son réglage.
      // « systeme » : le réglage « contenu sensible » du téléphone décide ; la version publique dit seulement
      // « Nouvelle note ». (Essai du 17/11/2026 : PRIVATE seul laissait tout voir sur un téléphone qui montre tout.)
      .setVisibility(if (ecranVerrouille == "systeme") NotificationCompat.VISIBILITY_PRIVATE else NotificationCompat.VISIBILITY_SECRET)
      .setPublicVersion(NotificationCompat.Builder(context, CANAL).setSmallIcon(icone).setContentTitle("Nouvelle note").build())
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
