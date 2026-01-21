import browser from "webextension-polyfill"

browser.runtime.onInstalled.addListener(() => {
  console.log("Passwuts installed (onInstalled)")
})

browser.runtime.onStartup.addListener(() => {
  console.log("Passwuts started (onStartup)")
})

browser.runtime.onMessage.addListener((msg: any) => {
  console.log("Background received message:", msg)
})
