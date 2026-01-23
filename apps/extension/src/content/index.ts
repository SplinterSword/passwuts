import browser from "webextension-polyfill"

type AutofillPayload = {
  username?: string
  password: string
}

function findInput(
  selectors: string[]
): HTMLInputElement | null {
  for (const selector of selectors) {
    const el = document.querySelector<HTMLInputElement>(selector)
    if (el && !el.disabled && el.type !== "hidden") {
      return el
    }
  }
  return null
}

function fillCredentials({ username, password }: AutofillPayload) {
  const usernameInput = findInput([
    'input[type="email"]',
    'input[type="text"]',
    'input[name*="user" i]',
    'input[name*="email" i]',
    'input[id*="user" i]',
    'input[id*="email" i]',
  ])

  const passwordInput = findInput([
    'input[type="password"]',
  ])

  if (username && usernameInput) {
    usernameInput.focus()
    usernameInput.value = username
    usernameInput.dispatchEvent(new Event("input", { bubbles: true }))
  }

  if (passwordInput) {
    passwordInput.focus()
    passwordInput.value = password
    passwordInput.dispatchEvent(new Event("input", { bubbles: true }))
  }
}

browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === "AUTOFILL_CREDENTIALS") {
    fillCredentials(msg.payload)
  }
})
