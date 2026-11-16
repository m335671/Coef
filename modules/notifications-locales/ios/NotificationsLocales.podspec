Pod::Spec.new do |s|
  s.name           = 'NotificationsLocales'
  s.version        = '0.1.0'
  s.summary        = 'Notifications locales ED-Clone, sans service push.'
  s.description    = 'Notifications locales ED-Clone, sans service push ni SDK tiers.'
  s.license        = 'UNLICENSED'
  s.author         = 'ED-Clone'
  s.homepage       = 'https://github.com/m335671/ED-Clone'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
end
