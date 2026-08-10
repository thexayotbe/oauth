import UIKit
import AppTrackingTransparency
import FBSDKCoreKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let windowScene = scene as? UIWindowScene else {
      return
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    appDelegate.reactNativeFactory.startReactNative(
      withModuleName: appDelegate.moduleName ?? "OAuthTestApp",
      in: window,
      initialProperties: appDelegate.initialProps,
      launchOptions: nil
    )
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
      ATTrackingManager.requestTrackingAuthorization { status in
        Settings.shared.isAdvertiserTrackingEnabled = status == .authorized
      }
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }
    ApplicationDelegate.shared.application(
      UIApplication.shared,
      open: url,
      sourceApplication: nil,
      annotation: [UIApplication.OpenURLOptionsKey.annotation: ""]
    )
  }
}
