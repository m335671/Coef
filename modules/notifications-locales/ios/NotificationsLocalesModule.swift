import ExpoModulesCore
import UserNotifications

// Notifications locales uniquement : aucun service push, aucun jeton, aucun SDK tiers.
// Écrit mais pas encore essayé sur un iPhone.
public class NotificationsLocalesModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NotificationsLocales")

    AsyncFunction("demanderAutorisation") { () async throws -> Bool in
      try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound])
    }

    AsyncFunction("effacer") {
      UNUserNotificationCenter.current().removeAllDeliveredNotifications()
    }

    AsyncFunction("autorisees") { () async -> Bool in
      await UNUserNotificationCenter.current().notificationSettings().authorizationStatus == .authorized
    }

    // ecranVerrouille : ignoré, iOS laisse ce choix aux réglages d'aperçu du système.
    AsyncFunction("afficher") { (id: Int, titre: String, texte: String, _ ecranVerrouille: String) async throws -> Bool in
      let contenu = UNMutableNotificationContent()
      contenu.title = titre
      contenu.body = texte
      contenu.sound = .default
      try await UNUserNotificationCenter.current().add(
        UNNotificationRequest(identifier: "notes-\(id)", content: contenu, trigger: nil))
      return true
    }
  }
}
