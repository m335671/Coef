package app.coef.notifications

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.ListenableWorker
import androidx.work.OneTimeWorkRequest
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit
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

    // Test du vrai chemin d'arrière-plan : le travailleur d'expo-background-task, mis en file WorkManager comme le
    // fait Android à chaque heure (classe prise par son nom : pas de dépendance de compilation sur le module expo).
    Function("lancerTestFond") { delaiSecondes: Int ->
      @Suppress("UNCHECKED_CAST")
      val travail = Class.forName("expo.modules.backgroundtask.BackgroundTaskWork") as Class<out ListenableWorker>
      val demande = OneTimeWorkRequest.Builder(travail)
        .setInputData(Data.Builder().putString("appScopeKey", context.packageName).build())
        .setInitialDelay(delaiSecondes.toLong(), TimeUnit.SECONDS)
        .build()
      WorkManager.getInstance(context).enqueueUniqueWork("COEF_TEST_SYNCHRO", ExistingWorkPolicy.REPLACE, demande)
      true
    }

    // L'optimisation de la batterie peut retarder ou bloquer la synchro de fond (WorkManager).
    Function("batterieOptimisee") {
      !context.getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(context.packageName)
    }

    // Fenêtre système « Autoriser l'app à toujours fonctionner en arrière-plan » ; à défaut (certains
    // fabricants la retirent), la liste des optimisations de batterie.
    Function("exempterBatterie") {
      val demande = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${context.packageName}"))
      try {
        context.startActivity(demande.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      } catch (e: ActivityNotFoundException) {
        context.startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
      Unit
    }

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
    val icone = R.drawable.coef_notification
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
